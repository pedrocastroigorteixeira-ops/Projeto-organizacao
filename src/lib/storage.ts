import { Area, Item } from '../types';
import { INITIAL_AREAS } from './constants';
import { formatDate } from './parser';
import { getSupabaseClient, isSupabaseConnected } from './supabase';
import { createNextRecurrenceItem, isRecurringItem } from './recurrence';

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
      energy_level: 'medium',
      recurrence: 'todo dia',
      status: 'pending',
      created_at: new Date().toISOString(),
      completed_at: null,
      subtasks: [
        { id: 'st-1', title: 'Abrir o sistema de vendas', completed: true },
        { id: 'st-2', title: 'Conferir extrato das maquininhas', completed: false },
        { id: 'st-3', title: 'Validar comprovantes de sangria', completed: false },
      ],
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
      energy_level: 'low',
      recurrence: null,
      status: 'pending',
      created_at: new Date().toISOString(),
      completed_at: null,
      subtasks: [
        { id: 'st-4', title: 'Contar estoque de sacolas e caixas', completed: true },
        { id: 'st-5', title: 'Mandar mensagem no WhatsApp pro fornecedor', completed: false },
      ],
    },
    {
      id: 'sample-3',
      title: 'Revisar protótipo da nova embalagem térmica',
      type: 'task',
      area_id: 'projetos',
      scheduled_date: yesterdayStr,
      scheduled_time: null,
      priority: 'normal',
      effort: 'medium',
      energy_level: 'high',
      recurrence: null,
      status: 'pending',
      created_at: yesterday.toISOString(),
      completed_at: null,
      subtasks: [
        { id: 'st-6', title: 'Abrir arquivo no Figma com especificações', completed: false },
        { id: 'st-7', title: 'Testar retenção de temperatura do lanche', completed: false },
        { id: 'st-8', title: 'Aprovar ou solicitar ajustes finais', completed: false },
      ],
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
    {
      id: 'sample-ritual-1',
      title: 'Recolher tributos e DAS (Simples Nacional)',
      type: 'task',
      area_id: 'divino-pao',
      scheduled_date: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-20`,
      scheduled_time: '14:00',
      priority: 'high',
      effort: 'medium',
      energy_level: 'high',
      recurrence: 'todo dia 20',
      advance_warning_days: 2, // Avisa 2 dias antes para emitir guia e programar saldo
      is_recurring: true,
      status: 'pending',
      created_at: new Date().toISOString(),
      completed_at: null,
      subtasks: [
        { id: 'sub-trib-1', title: 'Acessar o portal do Simples Nacional', completed: false },
        { id: 'sub-trib-2', title: 'Gerar a guia DAS do mês', completed: false },
        { id: 'sub-trib-3', title: 'Agendar pagamento no banco da empresa', completed: false },
      ],
    },
    {
      id: 'sample-ritual-2',
      title: 'Pagar pró-labore dos sócios e folha operacional',
      type: 'task',
      area_id: 'bendito-sabor',
      scheduled_date: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-05`,
      scheduled_time: '10:00',
      priority: 'high',
      effort: 'quick',
      energy_level: 'medium',
      recurrence: 'todo dia 5',
      advance_warning_days: 3, // Avisa 3 dias antes
      is_recurring: true,
      status: 'pending',
      created_at: new Date().toISOString(),
      completed_at: null,
      subtasks: [
        { id: 'sub-pro-1', title: 'Conferir holerites e valores líquidos', completed: false },
        { id: 'sub-pro-2', title: 'Fazer transferências PIX das contas PJ', completed: false },
      ],
    },
    {
      id: 'sample-ritual-3',
      title: 'Checar estoque de insumos e embalagens',
      type: 'task',
      area_id: 'divino-pao',
      scheduled_date: todayStr, // Ritual semanal de segunda-feira
      scheduled_time: '09:00',
      priority: 'normal',
      effort: 'medium',
      energy_level: 'medium',
      recurrence: 'toda seg',
      is_recurring: true,
      status: 'pending',
      created_at: new Date().toISOString(),
      completed_at: null,
      subtasks: [
        { id: 'sub-est-1', title: 'Contar sacas de farinha e fermento', completed: false },
        { id: 'sub-est-2', title: 'Verificar estoque de embalagens térmicas', completed: false },
        { id: 'sub-est-3', title: 'Anotar reposição necessária no fornecedor', completed: false },
      ],
    },
    {
      id: 'sample-ritual-4',
      title: 'Fechamento de mês e conciliação bancária',
      type: 'task',
      area_id: 'projetos',
      scheduled_date: formatDate(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
      scheduled_time: '17:00',
      priority: 'high',
      effort: 'long',
      energy_level: 'high',
      recurrence: 'fechamento de mês',
      advance_warning_days: 2,
      is_recurring: true,
      status: 'pending',
      created_at: new Date().toISOString(),
      completed_at: null,
      subtasks: [
        { id: 'sub-fec-1', title: 'Exportar OFX de todas as contas', completed: false },
        { id: 'sub-fec-2', title: 'Validar lançamentos no sistema contábil', completed: false },
        { id: 'sub-fec-3', title: 'Enviar extratos consolidados para o contador', completed: false },
      ],
    },
    {
      id: 'sample-decision-1',
      title: 'Mudança de fornecedor de caixas térmicas por causa de atraso',
      type: 'decision',
      area_id: 'divino-pao',
      decision_rationale:
        'O fornecedor antigo atrasou 3 entregas cruciais em novembro gerando falta de embalagens no balcão da loja. Fechamos com a Gráfica Alpha que cobra 4% a mais, porém com entrega garantida em 24h.',
      content:
        '# Termos do Acordo\n- Pedido mínimo: 500 unidades\n- Prazo de entrega: D+1 garantido\n- Contato do representante: Carlos (11) 98888-7777\n\n> Decisão tomada após reunião com equipe da expedição.',
      tags: ['@loja', '@fornecedor'],
      scheduled_date: todayStr,
      scheduled_time: null,
      priority: 'normal',
      effort: null,
      recurrence: null,
      status: 'pending',
      created_at: new Date().toISOString(),
      completed_at: null,
    },
    {
      id: 'sample-decision-2',
      title: 'Aquisição de nova masseira espiral para aumento de capacidade',
      type: 'decision',
      area_id: 'divino-pao',
      decision_rationale:
        'Gargalo crítico na produção de pães de fermentação natural nas sextas e sábados. Financiamento com juros subsidiados compensa pelo aumento de 40% na capacidade de massa.',
      content:
        '# Análise de Retorno\n- Custo total: R$ 18.500 em 12x\n- Aumento esperado de faturamento: +R$ 6.000/mês\n- Prazo de entrega do equipamento: 15 dias úteis',
      tags: ['@investimentos', '@loja'],
      scheduled_date: todayStr,
      scheduled_time: null,
      priority: 'normal',
      effort: null,
      recurrence: null,
      status: 'pending',
      created_at: new Date().toISOString(),
      completed_at: null,
    },
    {
      id: 'sample-note-1',
      title: 'Ideias de novos combos executivos para o cardápio da tarde',
      type: 'note',
      area_id: 'bendito-sabor',
      content:
        '# Cardápio de Inverno\n- **Combo 1:** Café coado na hora + Pão de queijo recheado com requeijão de corte\n- **Combo 2:** Cappuccino artesanal + Torta folhada de maçã com canela\n- **Executivo rápido:** Suco natural de laranja + Quiche de alho-poró\n\n> Testar precificação para manter margem mínima de 65%.',
      tags: ['@loja', '@cardapio'],
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
      id: 'sample-note-2',
      title: 'Planejamento financeiro de fim de ano e reserva de emergência',
      type: 'note',
      area_id: 'vida-pessoal',
      content:
        '# Objetivos Pessoais\n- [x] Aportar 20% do pró-labore na reserva de liquidez diária\n- [ ] Renovar passaporte no posto da Polícia Federal\n- [ ] Revisar apólice do seguro residencial\n\n> Priorizar tranquilidade mental e caixa livre para o início do ano.',
      tags: ['@investimentos', '@pessoal'],
      scheduled_date: null,
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
 * Retorna a data do próximo fim de semana (Sábado)
 */
export function getNextWeekend(): string {
  const d = new Date();
  const day = d.getDay(); // 0 = dom, 1 = seg ... 6 = sab
  let diff = 6 - day;
  if (diff <= 0) diff += 7;
  d.setDate(d.getDate() + diff);
  return formatDate(d);
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
 * Adia a tarefa diretamente para o próximo fim de semana (+fim de semana)
 */
export async function postponeToWeekend(id: string): Promise<Item | null> {
  const weekendStr = getNextWeekend();
  return updateItem(id, { scheduled_date: weekendStr });
}

/**
 * Adia todas as pendências de ontem para amanhã (+1 dia)
 */
export async function postponeAllYesterday(days: number = 1): Promise<number> {
  const todayStr = formatDate(new Date());
  const allItems = await fetchItems();

  const overdue = allItems.filter(
    (item) =>
      item.status === 'pending' &&
      item.scheduled_date &&
      item.scheduled_date < todayStr
  );

  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + days);
  const targetDateStr = formatDate(targetDate);

  for (const item of overdue) {
    await updateItem(item.id, { scheduled_date: targetDateStr });
  }

  return overdue.length;
}

/**
 * Adia todas as pendências de ontem para o próximo fim de semana
 */
export async function postponeAllYesterdayToWeekend(): Promise<number> {
  const todayStr = formatDate(new Date());
  const allItems = await fetchItems();

  const overdue = allItems.filter(
    (item) =>
      item.status === 'pending' &&
      item.scheduled_date &&
      item.scheduled_date < todayStr
  );

  const weekendStr = getNextWeekend();

  for (const item of overdue) {
    await updateItem(item.id, { scheduled_date: weekendStr });
  }

  return overdue.length;
}

/**
 * Move a tarefa de volta para o Inbox (remove data agendada)
 */
export async function moveItemToInbox(id: string): Promise<Item | null> {
  return updateItem(id, { scheduled_date: null });
}

/**
 * Conclui um item. Se o item for recorrente / ritual operacional:
 * "Marcar como concluído no dia não remove a próxima ocorrência."
 * Mantém o registro do dia atual como 'completed' e gera automaticamente
 * a próxima ocorrência com data futura e checklist limpo.
 */
export async function completeItemWithRecurrence(
  id: string
): Promise<{ completedItem: Item | null; nextOccurrence: Item | null }> {
  const completedAt = new Date().toISOString();
  const updatedItem = await updateItem(id, {
    status: 'completed',
    completed_at: completedAt,
  });

  if (!updatedItem || !isRecurringItem(updatedItem)) {
    return { completedItem: updatedItem, nextOccurrence: null };
  }

  // Verifica se já existe uma ocorrência futura pendente deste ritual para não duplicar
  const currentItems = await fetchItems();
  const alreadyHasFuture = currentItems.some(
    (it) =>
      it.id !== updatedItem.id &&
      it.status === 'pending' &&
      (it.parent_recurrence_id === updatedItem.id ||
        (updatedItem.parent_recurrence_id &&
          it.parent_recurrence_id === updatedItem.parent_recurrence_id))
  );

  if (alreadyHasFuture) {
    return { completedItem: updatedItem, nextOccurrence: null };
  }

  // Cria a próxima ocorrência com base na regra de recorrência
  const nextItemTemplate = createNextRecurrenceItem(updatedItem);
  const nextOccurrence = await createItem({
    title: nextItemTemplate.title,
    content: nextItemTemplate.content,
    type: nextItemTemplate.type,
    area_id: nextItemTemplate.area_id,
    scheduled_date: nextItemTemplate.scheduled_date,
    scheduled_time: nextItemTemplate.scheduled_time,
    priority: nextItemTemplate.priority,
    effort: nextItemTemplate.effort,
    recurrence: nextItemTemplate.recurrence,
    advance_warning_days: nextItemTemplate.advance_warning_days,
    is_recurring: true,
    parent_recurrence_id: nextItemTemplate.parent_recurrence_id,
    status: 'pending',
    energy_level: nextItemTemplate.energy_level,
    subtasks: nextItemTemplate.subtasks,
  });

  return { completedItem: updatedItem, nextOccurrence };
}
