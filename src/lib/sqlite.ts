import fs from 'node:fs';
import path from 'node:path';

// Interface para as credenciais salvas no SQLite local
export interface CalendarAuthRecord {
  provider: 'google' | 'apple';
  client_id: string;
  client_secret: string;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: number | null; // Timestamp em milissegundos
  account_email: string | null;
  calendar_id: string;
  is_active: number; // 0 ou 1
  updated_at: string;
}

export interface SyncMappingRecord {
  item_id: string;
  external_id: string;
  provider: 'google' | 'apple';
  etag: string | null;
  last_synced_at: string;
}

export interface OutboxItemRecord {
  id: string;
  item_id: string;
  action: 'insert' | 'update' | 'delete';
  payload: string; // JSON
  status: 'pending' | 'processing' | 'failed' | 'synced';
  error: string | null;
  created_at: string;
  processed_at: string | null;
}

let dbInstance: any = null;

export function closeDatabase(): void {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch (e) {
      console.warn('Erro ao fechar conexão com SQLite:', e);
    }
    dbInstance = null;
  }
}

export function getDatabase() {
  if (dbInstance) return dbInstance;

  // Garante que o diretório data exista na raiz do projeto
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, 'local_calendar_sync.db');

  // Importação dinâmica/nativa de node:sqlite
  // Compatível com Node.js 22 e 24+
  const { DatabaseSync } = require('node:sqlite');
  dbInstance = new DatabaseSync(dbPath);

  // Inicializa as tabelas se não existirem
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS calendar_auth (
      provider TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      client_secret TEXT NOT NULL,
      access_token TEXT,
      refresh_token TEXT,
      expires_at INTEGER,
      account_email TEXT,
      calendar_id TEXT DEFAULT 'primary',
      is_active INTEGER DEFAULT 1,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS calendar_sync_mappings (
      item_id TEXT PRIMARY KEY,
      external_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      etag TEXT,
      last_synced_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sync_outbox (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      action TEXT NOT NULL,
      payload TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      error TEXT,
      created_at TEXT NOT NULL,
      processed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS calendar_cached_events (
      id TEXT PRIMARY KEY,
      external_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      title TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT,
      raw_json TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_items (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      area_id TEXT,
      scheduled_date TEXT,
      scheduled_time TEXT,
      priority TEXT,
      effort TEXT,
      recurrence TEXT,
      status TEXT NOT NULL,
      raw_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  return dbInstance;
}

/**
 * Busca credenciais de um provedor (ex: 'google')
 */
export function getCalendarAuth(provider: 'google' | 'apple'): CalendarAuthRecord | null {
  try {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM calendar_auth WHERE provider = ?');
    const row = stmt.get(provider);
    return (row as CalendarAuthRecord) || null;
  } catch (err) {
    console.error('Erro ao buscar credenciais no SQLite:', err);
    return null;
  }
}

/**
 * Salva ou atualiza as credenciais do provedor no SQLite
 */
export function saveCalendarAuth(record: {
  provider: 'google' | 'apple';
  client_id: string;
  client_secret: string;
  access_token?: string | null;
  refresh_token?: string | null;
  expires_at?: number | null;
  account_email?: string | null;
  calendar_id?: string;
  is_active?: number;
}): void {
  const db = getDatabase();
  const existing = getCalendarAuth(record.provider);

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO calendar_auth (
      provider, client_id, client_secret, access_token, refresh_token,
      expires_at, account_email, calendar_id, is_active, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = new Date().toISOString();
  stmt.run(
    record.provider,
    record.client_id,
    record.client_secret,
    record.access_token !== undefined ? record.access_token : (existing?.access_token ?? null),
    record.refresh_token !== undefined ? record.refresh_token : (existing?.refresh_token ?? null),
    record.expires_at !== undefined ? record.expires_at : (existing?.expires_at ?? null),
    record.account_email !== undefined ? record.account_email : (existing?.account_email ?? null),
    record.calendar_id || existing?.calendar_id || 'primary',
    record.is_active !== undefined ? record.is_active : (existing?.is_active ?? 1),
    now
  );
}

/**
 * Desconecta/remove a integração
 */
export function deleteCalendarAuth(provider: 'google' | 'apple'): void {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM calendar_auth WHERE provider = ?');
  stmt.run(provider);
}

/**
 * Busca mapeamento de um item com id externo
 */
export function getSyncMapping(itemId: string): SyncMappingRecord | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM calendar_sync_mappings WHERE item_id = ?');
  const row = stmt.get(itemId);
  return (row as SyncMappingRecord) || null;
}

/**
 * Busca mapeamento por ID externo (ex: Google Event ID)
 */
export function getSyncMappingByExternalId(externalId: string): SyncMappingRecord | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM calendar_sync_mappings WHERE external_id = ?');
  const row = stmt.get(externalId);
  return (row as SyncMappingRecord) || null;
}

/**
 * Salva ou atualiza mapeamento entre item local e ID externo
 */
export function saveSyncMapping(
  itemId: string,
  externalId: string,
  provider: 'google' | 'apple',
  etag?: string | null
): void {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO calendar_sync_mappings (
      item_id, external_id, provider, etag, last_synced_at
    ) VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(itemId, externalId, provider, etag || null, new Date().toISOString());
}

/**
 * Deleta mapeamento
 */
export function deleteSyncMapping(itemId: string): void {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM calendar_sync_mappings WHERE item_id = ?');
  stmt.run(itemId);
}

/**
 * Enfileira uma ação no Outbox para sincronização offline
 */
export function queueOutboxAction(
  itemId: string,
  action: 'insert' | 'update' | 'delete',
  payload: any
): void {
  const db = getDatabase();
  const id = `outbox_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const stmt = db.prepare(`
    INSERT INTO sync_outbox (id, item_id, action, payload, status, created_at)
    VALUES (?, ?, ?, ?, 'pending', ?)
  `);
  stmt.run(id, itemId, action, JSON.stringify(payload), new Date().toISOString());
}

/**
 * Busca itens pendentes no Outbox
 */
export function getPendingOutbox(): OutboxItemRecord[] {
  const db = getDatabase();
  const stmt = db.prepare("SELECT * FROM sync_outbox WHERE status = 'pending' ORDER BY created_at ASC");
  return stmt.all() as OutboxItemRecord[];
}

/**
 * Atualiza status de um item do Outbox
 */
export function updateOutboxStatus(
  id: string,
  status: 'processing' | 'synced' | 'failed',
  error?: string | null
): void {
  const db = getDatabase();
  const stmt = db.prepare(`
    UPDATE sync_outbox
    SET status = ?, error = ?, processed_at = ?
    WHERE id = ?
  `);
  stmt.run(status, error || null, new Date().toISOString(), id);
}

/**
 * Limpa itens já sincronizados do outbox
 */
export function clearSyncedOutbox(): void {
  const db = getDatabase();
  db.exec("DELETE FROM sync_outbox WHERE status = 'synced'");
}

/**
 * Salva ou atualiza item do app no SQLite
 */
export function upsertAppItem(item: any): void {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO app_items (
      id, title, type, area_id, scheduled_date, scheduled_time,
      priority, effort, recurrence, status, raw_json, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    item.id,
    item.title,
    item.type || 'task',
    item.area_id || null,
    item.scheduled_date || null,
    item.scheduled_time || null,
    item.priority || 'normal',
    item.effort || null,
    item.recurrence || null,
    item.status || 'pending',
    JSON.stringify(item),
    new Date().toISOString()
  );
}

/**
 * Remove item do app do SQLite
 */
export function deleteAppItem(id: string): void {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM app_items WHERE id = ?');
  stmt.run(id);
}

/**
 * Busca todos os itens do app salvos no SQLite
 */
export function getAllAppItems(): any[] {
  try {
    const db = getDatabase();
    const stmt = db.prepare('SELECT raw_json FROM app_items ORDER BY updated_at DESC');
    const rows = stmt.all() as { raw_json: string }[];
    return rows.map((r) => JSON.parse(r.raw_json));
  } catch (err) {
    console.error('Erro ao ler app_items do SQLite:', err);
    return [];
  }
}

