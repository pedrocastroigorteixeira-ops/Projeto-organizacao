export type EffortType = 'quick' | 'medium' | 'long';
export type ItemType = 'task' | 'note';
export type PriorityType = 'normal' | 'high';
export type ItemStatus = 'pending' | 'completed' | 'archived';

export interface Area {
  id: string;
  name: string;
  slug: string;
  color: string;
  display_order: number;
}

export interface Item {
  id: string;
  title: string;
  type: ItemType;
  area_id: string | null;
  scheduled_date: string | null; // YYYY-MM-DD
  scheduled_time: string | null; // HH:MM
  priority: PriorityType;
  effort: EffortType | null;
  recurrence: string | null;
  status: ItemStatus;
  created_at: string;
  completed_at: string | null;
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
  isInbox: boolean;
}
