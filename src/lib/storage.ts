import { Area, Item } from '../types';
import { INITIAL_AREAS } from './constants';
import { formatDate } from './parser';
import { getSupabaseClient, isSupabaseConnected } from './supabase';

const LOCAL_ITEMS_KEY = 'sistema_organizacao_items_v1';
const LOCAL_AREAS_KEY = 'sistema_organizacao_areas_v1';

function getInitialSampleItems(): Item[] {
  const today = new Date();
  const todayStr = formatDate(today);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = formatDate(yesterday);

  return [
    {
      id: 'sample-1',
      title: 'Conferir fechamento do caixa matutino',
      type: 'task',
      area_id: 'divino-pao',
      scheduled_date: todayStr,
      scheduled_time: '11:30',
      priority: 'high',
      effort: 'quick',
      recurrence: 'todo dia',
      status: 'pending',
      created_at: new Date().toISOString(),
      completed_at: null,
    },
    {
      id: 'sample-2',
      title: 'Mandar pedido de fornecedor de embalagens',
      type: 'task',
      area_id: 'bendito-sabor',
      scheduled_date: todayStr,
      scheduled_time: '15:00',
      priority: 'normal',
      effort: 'quick',
      recurrence: null,
      status: 'pending',
      created_at: new Date().toISOString(),
      completed_at: null,
    },
    {
      id: 'sample-3',
      title: 'Revisar protótipo da nova embalagem térmica',
      type: 'task',
      area_id: 'projetos',
      scheduled_date: yesterdayStr, // Tarefa pendente de ontem para demonstrar o banner "trazer tudo pra hoje"
      scheduled_time: null,
      priority: 'normal',
      effort: 'medium',
      recurrence: null,
      status: 'pending',
      created_at: yesterday.toISOString(),
      completed_at: null,
    },
    {
      id: 'sample-4',
      title: 'Comprar peça de reposição do forno industrial',
      type: 'task',
      area_id: null, // Sem frente e sem data -> Inbox
      scheduled_date: null,
      scheduled_time: null,
      priority: 'normal',
      effort: null,
      recurrence: null,
      status: 'pending',
      created_at: new Date().toISOString(),
      completed_at: null,
    },
    {
      id: 'sample-5',
      title: 'Testar novo combo de lanche da tarde',
      type: 'note',
      area_id: 'divino-pao',
      scheduled_date: null, // Sem data -> Inbox
      scheduled_time: null,
      priority: 'normal',
      effort: null,
      recurrence: null,
      status: 'pending',
      created_at: new Date().toISOString(),
      completed_at: null,
    },
  ];
}

// ==========================================
// FUNÇÕES LOCAIS (FALLBACK / MOCK)
// ==========================================

function getLocalItems(): Item[] {
  if (typeof window === 'undefined') return getInitialSampleItems();
  try {
    const data = localStorage.getItem(LOCAL_ITEMS_KEY);
    if (!data) {
      const initial = getInitialSampleItems();
      localStorage.setItem(LOCAL_ITEMS_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(data);
  } catch (e) {
    console.error('Erro ao ler items do localStorage:', e);
    return getInitialSampleItems();
  }
}

function saveLocalItems(items: Item[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_ITEMS_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Erro ao salvar items no localStorage:', e);
  }
}

export function getLocalAreas(): Area[] {
  if (typeof window === 'undefined') return INITIAL_AREAS;
  try {
    const data = localStorage.getItem(LOCAL_AREAS_KEY);
    if (!data) {
      localStorage.setItem(LOCAL_AREAS_KEY, JSON.stringify(INITIAL_AREAS));
      return INITIAL_AREAS;
    }
    return JSON.parse(data);
  } catch {
    return INITIAL_AREAS;
  }
}

// ==========================================
// SERVIÇO UNIFICADO (SUPABASE + LOCAL STORAGE)
// ==========================================

export async function fetchAreas(): Promise<Area[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('frentes')
        .select('*')
        .order('display_order', { ascending: true });

      if (!error && data && data.length > 0) {
        return data as Area[];
      }
    } catch (err) {
      console.warn('Falha ao buscar frentes no Supabase, usando local:', err);
    }
  }
  return getLocalAreas();
}

export async function fetchItems(): Promise<Item[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data as Item[];
      }
    } catch (err) {
      console.warn('Falha ao buscar items no Supabase, usando local:', err);
    }
  }
  return getLocalItems();
}

export async function createItem(
  itemData: Omit<Item, 'id' | 'created_at' | 'completed_at'>
): Promise<Item> {
  const newItem: Item = {
    ...itemData,
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    created_at: new Date().toISOString(),
    completed_at: itemData.status === 'completed' ? new Date().toISOString() : null,
  };

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('items')
        .insert([newItem])
        .select()
        .single();

      if (!error && data) {
        // Também atualiza o backup local
        const current = getLocalItems();
        saveLocalItems([data as Item, ...current]);
        return data as Item;
      }
    } catch (err) {
      console.warn('Falha ao inserir item no Supabase, salvando local:', err);
    }
  }

  const current = getLocalItems();
  const updated = [newItem, ...current];
  saveLocalItems(updated);
  return newItem;
}

export async function updateItem(
  id: string,
  updates: Partial<Item>
): Promise<Item | null> {
  const supabase = getSupabaseClient();
  let updatedItem: Item | null = null;

  if (supabase) {
    try {
      const payload = { ...updates };
      if (updates.status === 'completed') {
        payload.completed_at = new Date().toISOString();
      } else if (updates.status === 'pending') {
        payload.completed_at = null;
      }

      const { data, error } = await supabase
        .from('items')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        updatedItem = data as Item;
      }
    } catch (err) {
      console.warn('Falha ao atualizar item no Supabase:', err);
    }
  }

  // Atualiza localmente
  const current = getLocalItems();
  const index = current.findIndex((i) => i.id === id);
  if (index !== -1) {
    const item = current[index];
    const completedAt =
      updates.status === 'completed'
        ? new Date().toISOString()
        : updates.status === 'pending'
        ? null
        : item.completed_at;

    const merged: Item = {
      ...item,
      ...updates,
      completed_at: completedAt,
    };
    current[index] = merged;
    saveLocalItems(current);
    if (!updatedItem) updatedItem = merged;
  }

  return updatedItem;
}

export async function deleteItem(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('items').delete().eq('id', id);
    } catch (err) {
      console.warn('Falha ao deletar item no Supabase:', err);
    }
  }

  const current = getLocalItems();
  const filtered = current.filter((i) => i.id !== id);
  saveLocalItems(filtered);
}

/**
 * Reagenda todas as tarefas de ontem ou anteriores não concluídas para hoje
 */
export async function bringYesterdayToToday(): Promise<number> {
  const todayStr = formatDate(new Date());
  const allItems = await fetchItems();

  const overdue = allItems.filter(
    (item) =>
      item.status === 'pending' &&
      item.scheduled_date &&
      item.scheduled_date < todayStr
  );

  for (const item of overdue) {
    await updateItem(item.id, { scheduled_date: todayStr });
  }

  return overdue.length;
}

/**
 * Adiciona X dias à data de agendamento (ex: +1 dia, +7 dias)
 */
export async function postponeItem(id: string, days: number): Promise<Item | null> {
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + days);
  const newDateStr = formatDate(baseDate);

  return updateItem(id, { scheduled_date: newDateStr });
}

/**
 * Move a tarefa de volta para o Inbox (remove data agendada)
 */
export async function moveItemToInbox(id: string): Promise<Item | null> {
  return updateItem(id, { scheduled_date: null });
}
