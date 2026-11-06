import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { getDatabase, closeDatabase } from './sqlite';

export interface BackupFileInfo {
  filename: string;
  sizeBytes: number;
  sizeFormatted: string;
  type: 'daily' | 'pre_restore' | 'manual';
  createdAt: string;
  isSafetyBackup: boolean;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getDatabasePath(): string {
  return path.join(process.cwd(), 'data', 'local_calendar_sync.db');
}

export function getBackupDirectory(): string {
  const dir = path.join(process.cwd(), 'data', 'backups');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Cria cópia compactada (.db.gz) do banco SQLite local
 */
export function createCompressedBackup(
  prefix: 'daily' | 'pre_restore' | 'manual' = 'daily'
): BackupFileInfo {
  const dbPath = getDatabasePath();
  const backupDir = getBackupDirectory();

  // Garante que o banco exista antes de fazer o backup
  if (!fs.existsSync(dbPath)) {
    getDatabase(); // inicializa se ainda não existia
  }

  const rawData = fs.readFileSync(dbPath);
  const compressedData = zlib.gzipSync(rawData, { level: 9 });

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  const timestamp = `${year}${month}${day}_${hours}${minutes}${seconds}`;
  const filename = `backup_${prefix}_${timestamp}.db.gz`;
  const targetPath = path.join(backupDir, filename);

  fs.writeFileSync(targetPath, compressedData);

  // Executa política de retenção para os últimos 30 dias se for backup rotineiro
  if (prefix === 'daily') {
    pruneOldBackups(30);
  }

  return {
    filename,
    sizeBytes: compressedData.length,
    sizeFormatted: formatBytes(compressedData.length),
    type: prefix,
    createdAt: now.toISOString(),
    isSafetyBackup: prefix === 'pre_restore',
  };
}

/**
 * Rotação e retenção: mantém histórico dos últimos 30 dias
 */
export function pruneOldBackups(maxDays: number = 30): { kept: number; deleted: number } {
  const backupDir = getBackupDirectory();
  const files = fs.readdirSync(backupDir);

  const now = Date.now();
  const maxAgeMs = maxDays * 24 * 60 * 60 * 1000;
  let deletedCount = 0;
  let keptCount = 0;

  // Coleta backups diários ordenados por data
  const dailyBackups: { name: string; mtime: number }[] = [];

  for (const file of files) {
    if (!file.endsWith('.db.gz') && !file.endsWith('.json')) continue;

    const fullPath = path.join(backupDir, file);
    const stats = fs.statSync(fullPath);

    if (file.startsWith('backup_daily_')) {
      dailyBackups.push({ name: file, mtime: stats.mtimeMs });
    }
  }

  // Ordena do mais recente para o mais antigo
  dailyBackups.sort((a, b) => b.mtime - a.mtime);

  // Mantém no mínimo os backups dos últimos maxDays dias (ou até 30 arquivos diários)
  dailyBackups.forEach((b, index) => {
    const age = now - b.mtime;
    // Se passou de 30 dias E já temos mais de 30 cópias
    if (age > maxAgeMs && index >= maxDays) {
      fs.unlinkSync(path.join(backupDir, b.name));
      deletedCount++;
    } else {
      keptCount++;
    }
  });

  return { kept: keptCount, deleted: deletedCount };
}

/**
 * Rotina automática diária: executa backup silencioso se ainda não foi feito hoje
 */
export function runDailyBackupIfNeeded(): BackupFileInfo | null {
  const backupDir = getBackupDirectory();
  const files = fs.readdirSync(backupDir);

  const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const alreadyRanToday = files.some(
    (file) => file.startsWith(`backup_daily_${todayStr}`) && file.endsWith('.db.gz')
  );

  if (alreadyRanToday) {
    return null;
  }

  console.log(`[Rotina de Backup] Iniciando backup diário automático para ${todayStr}...`);
  const backup = createCompressedBackup('daily');
  console.log(`[Rotina de Backup] Concluído: ${backup.filename} (${backup.sizeFormatted})`);
  return backup;
}

/**
 * Lista todos os backups disponíveis ordenados do mais recente para o mais antigo
 */
export function listAvailableBackups(): BackupFileInfo[] {
  const backupDir = getBackupDirectory();
  const files = fs.readdirSync(backupDir);

  const result: BackupFileInfo[] = [];

  for (const file of files) {
    if (!file.endsWith('.db.gz') && !file.endsWith('.json')) continue;

    const fullPath = path.join(backupDir, file);
    const stats = fs.statSync(fullPath);

    let type: 'daily' | 'pre_restore' | 'manual' = 'manual';
    if (file.includes('daily')) type = 'daily';
    else if (file.includes('pre_restore')) type = 'pre_restore';

    result.push({
      filename: file,
      sizeBytes: stats.size,
      sizeFormatted: formatBytes(stats.size),
      type,
      createdAt: stats.mtime.toISOString(),
      isSafetyBackup: type === 'pre_restore',
    });
  }

  // Ordena do mais novo para o mais antigo
  return result.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * TRAVA DE SEGURANÇA & RESTAURAÇÃO:
 * Antes de qualquer restauração, gera automaticamente uma cópia de segurança
 * do estado atual (pre_restore_backup_...) para garantia absoluta de integridade.
 */
export function restoreBackupFromFile(
  filename: string
): { success: boolean; safetyBackup: BackupFileInfo; restoredAt: string } {
  const backupDir = getBackupDirectory();
  const sourcePath = path.join(backupDir, filename);

  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Arquivo de backup não encontrado: ${filename}`);
  }

  const compressedData = fs.readFileSync(sourcePath);
  let rawDbBuffer: Buffer;

  if (filename.endsWith('.gz')) {
    rawDbBuffer = zlib.gunzipSync(compressedData);
  } else {
    rawDbBuffer = compressedData;
  }

  // Validação do cabeçalho SQLite (Magic Header: SQLite format 3\0)
  const header = rawDbBuffer.subarray(0, 16).toString('utf-8');
  if (!header.startsWith('SQLite format 3')) {
    throw new Error('Arquivo de backup inválido: não é uma base SQLite íntegra.');
  }

  // 1. TRAVA DE SEGURANÇA OBRIGATÓRIA: Cópia do estado atual ANTES de restaurar
  console.log('[Trava de Segurança] Gerando cópia de segurança do estado atual antes da restauração...');
  const safetyBackup = createCompressedBackup('pre_restore');
  console.log(`[Trava de Segurança] Cópia gerada com sucesso: ${safetyBackup.filename}`);

  // 2. Fecha conexões abertas no SQLite para liberar locks
  closeDatabase();

  // 3. Substitui o arquivo local pelo conteúdo restaurado
  const dbPath = getDatabasePath();
  fs.writeFileSync(dbPath, rawDbBuffer);

  // 4. Reabre o banco e verifica integridade
  const db = getDatabase();
  const check = db.prepare('PRAGMA integrity_check').get() as { integrity_check: string };
  if (check.integrity_check !== 'ok') {
    throw new Error(`Falha na verificação de integridade do banco restaurado: ${check.integrity_check}`);
  }

  return {
    success: true,
    safetyBackup,
    restoredAt: new Date().toISOString(),
  };
}

/**
 * Restaura o banco de dados a partir de um Buffer recebido por upload
 */
export function restoreBackupFromBuffer(
  inputBuffer: Buffer
): { success: boolean; safetyBackup: BackupFileInfo; restoredAt: string } {
  let rawDbBuffer: Buffer;

  // Verifica se é gzip (magic bytes: 0x1f, 0x8b)
  if (inputBuffer.length >= 2 && inputBuffer[0] === 0x1f && inputBuffer[1] === 0x8b) {
    rawDbBuffer = zlib.gunzipSync(inputBuffer);
  } else {
    rawDbBuffer = inputBuffer;
  }

  // Validação do cabeçalho SQLite
  const header = rawDbBuffer.subarray(0, 16).toString('utf-8');
  if (!header.startsWith('SQLite format 3')) {
    throw new Error('Arquivo de backup corrompido ou formato não suportado.');
  }

  // 1. TRAVA DE SEGURANÇA OBRIGATÓRIA
  const safetyBackup = createCompressedBackup('pre_restore');

  // 2. Fecha conexão atual
  closeDatabase();

  // 3. Escreve novo banco
  const dbPath = getDatabasePath();
  fs.writeFileSync(dbPath, rawDbBuffer);

  // 4. Reabre e valida
  const db = getDatabase();
  const check = db.prepare('PRAGMA integrity_check').get() as { integrity_check: string };
  if (check.integrity_check !== 'ok') {
    throw new Error(`Falha de integridade: ${check.integrity_check}`);
  }

  return {
    success: true,
    safetyBackup,
    restoredAt: new Date().toISOString(),
  };
}

/**
 * Exporta toda a base SQLite como JSON estruturado
 */
export function exportFullDatabaseAsJson(): {
  version: number;
  exportedAt: string;
  tables: {
    app_items: any[];
    calendar_auth: any[];
    calendar_sync_mappings: any[];
    sync_outbox: any[];
  };
} {
  const db = getDatabase();

  const appItems = (db.prepare('SELECT * FROM app_items').all() as any[]).map((row) => ({
    ...row,
    raw_json: row.raw_json ? JSON.parse(row.raw_json) : null,
  }));

  const calendarAuth = db.prepare('SELECT provider, client_id, account_email, calendar_id, is_active, updated_at FROM calendar_auth').all();
  const mappings = db.prepare('SELECT * FROM calendar_sync_mappings').all();
  const outbox = db.prepare('SELECT * FROM sync_outbox').all();

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    tables: {
      app_items: appItems,
      calendar_auth: calendarAuth,
      calendar_sync_mappings: mappings,
      sync_outbox: outbox,
    },
  };
}

/**
 * Restaura base a partir de JSON estruturado (com TRAVA DE SEGURANÇA prévia)
 */
export function restoreDatabaseFromJson(jsonData: any): {
  success: boolean;
  safetyBackup: BackupFileInfo;
  itemsRestored: number;
} {
  if (!jsonData || !jsonData.tables || !Array.isArray(jsonData.tables.app_items)) {
    throw new Error('Arquivo JSON inválido para restauração.');
  }

  // 1. TRAVA DE SEGURANÇA OBRIGATÓRIA
  const safetyBackup = createCompressedBackup('pre_restore');

  const db = getDatabase();
  db.exec('BEGIN TRANSACTION;');

  try {
    db.exec('DELETE FROM app_items;');
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO app_items (
        id, title, type, area_id, scheduled_date, scheduled_time,
        priority, effort, recurrence, status, raw_json, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of jsonData.tables.app_items) {
      const rawJson = typeof item.raw_json === 'string' ? item.raw_json : JSON.stringify(item.raw_json || item);
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
        rawJson,
        item.updated_at || new Date().toISOString()
      );
    }

    db.exec('COMMIT;');

    return {
      success: true,
      safetyBackup,
      itemsRestored: jsonData.tables.app_items.length,
    };
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}
