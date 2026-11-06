export type PriorityType = 'normal' | 'high';
export type EffortType = 'quick' | 'medium' | 'long';
export type ItemType = 'task' | 'note' | 'decision';
export type ItemStatus = 'pending' | 'completed' | 'archived';
export type EnergyLevel = 'low' | 'medium' | 'high';
export type ActiveTab = 'hoje' | 'inbox' | 'board' | 'semana' | 'hub' | 'anotacoes' | 'configuracoes';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Area {
  id: string;
  name: string;
  slug: string;
  color: string;
  display_order: number;
  description?: string;
}

export interface Item {
  id: string;
  title: string;
  content?: string;
  type: ItemType;
  area_id: string | null;
  scheduled_date: string | null; // YYYY-MM-DD
  scheduled_time: string | null; // HH:MM
  priority: PriorityType;
  effort: EffortType | null;
  recurrence: string | null;
  advance_warning_days?: number | null; // Dias de aviso antecipado (ex: 2 para avisar 2 dias antes)
  is_recurring?: boolean;
  parent_recurrence_id?: string | null;
  tags?: string[]; // Tags de contexto (ex: @loja, @investimentos, @pessoal)
  decision_rationale?: string; // Racional da decisão (para não esquecer o motivo semanas depois)
  status: ItemStatus;
  created_at: string;
  completed_at: string | null;
  subtasks?: Subtask[];
  energy_level?: EnergyLevel | null;
}

export interface ParsedCapture {
  cleanTitle: string;
  rawInput: string;
  area: Area | null;
  unrecognizedArea: string | null;
  scheduledDate: string | null; // YYYY-MM-DD
  scheduledTime: string | null; // HH:MM
  dateLabel: string | null;
  priority: PriorityType;
  effort: EffortType | null;
  effortLabel: string | null;
  type: ItemType;
  recurrence: string | null;
  advanceWarningDays: number | null;
  isRecurring: boolean;
  tags: string[];
  isInbox: boolean;
}
