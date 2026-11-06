import { Item, Area } from '../types';

export interface ConflictResult {
  hasConflict: boolean;
  conflictingItem?: Item;
  conflictingAreaName?: string;
  conflictingInterval?: string;
  suggestedSlot?: string;
}

/**
 * Converte 'HH:MM' em número total de minutos desde a meia-noite
 */
export function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Converte minutos totais de volta para 'HH:MM'
 */
export function minutesToTime(totalMinutes: number): string {
  const norm = ((totalMinutes % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Calcula a duração estimada em minutos baseada no esforço ou padrão (60 min)
 */
export function getItemDurationMinutes(item: Partial<Item>): number {
  if (item.effort === 'quick') return 30;
  if (item.effort === 'long') return 120;
  return 60; // padrão: 1 hora
}

/**
 * Bloqueio inteligente: detecta choque de horário entre dois compromissos no mesmo dia
 */
export function checkScheduleConflict(
  targetDate: string,
  targetTime: string,
  targetDurationMinutes: number = 60,
  excludeItemId: string | null = null,
  existingItems: Item[],
  areas: Area[] = []
): ConflictResult {
  if (!targetDate || !targetTime) {
    return { hasConflict: false };
  }

  const targetStart = timeToMinutes(targetTime);
  const targetEnd = targetStart + targetDurationMinutes;

  const sameDayItems = existingItems.filter(
    (item) =>
      item.scheduled_date === targetDate &&
      item.scheduled_time &&
      item.status === 'pending' &&
      item.id !== excludeItemId
  );

  for (const item of sameDayItems) {
    const itemStart = timeToMinutes(item.scheduled_time!);
    const itemDuration = getItemDurationMinutes(item);
    const itemEnd = itemStart + itemDuration;

    // Dois intervalos se sobrepõem se o início do mais tardio for antes do fim do mais cedo
    const overlaps = Math.max(targetStart, itemStart) < Math.min(targetEnd, itemEnd);

    if (overlaps) {
      const area = areas.find((a) => a.id === item.area_id);
      const conflictStartStr = minutesToTime(itemStart);
      const conflictEndStr = minutesToTime(itemEnd);

      // Sugere o próximo horário vago logo após o término do compromisso conflitante
      const suggestedTime = minutesToTime(itemEnd);

      return {
        hasConflict: true,
        conflictingItem: item,
        conflictingAreaName: area ? area.name : 'Geral / Pessoal',
        conflictingInterval: `${conflictStartStr} às ${conflictEndStr}`,
        suggestedSlot: suggestedTime,
      };
    }
  }

  return { hasConflict: false };
}
