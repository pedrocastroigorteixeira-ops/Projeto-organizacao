import { Item } from '../types';
import { formatDate } from './parser';

/**
 * Retorna o último dia de um determinado mês e ano
 */
function getLastDayOfMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/**
 * Ajusta um dia desejado para caber no mês especificado
 * (ex: se o alvo é dia 31 e o mês só tem 30 dias, retorna 30; se fev tem 28, retorna 28).
 */
function clampDayToMonth(year: number, monthIndex: number, targetDay: number): number {
  const maxDays = getLastDayOfMonth(year, monthIndex);
  return Math.min(targetDay, maxDays);
}

/**
 * Normaliza strings para facilitar comparações (remove acentos e caixa baixa)
 */
function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Mapa de dias da semana para índices JavaScript (0 = Dom, 1 = Seg, ..., 6 = Sáb)
 */
const WEEKDAYS_MAP: Record<string, number> = {
  dom: 0,
  domingo: 0,
  seg: 1,
  segunda: 1,
  ter: 2,
  terca: 2,
  terça: 2,
  qua: 3,
  quarta: 3,
  qui: 4,
  quinta: 4,
  sex: 5,
  sexta: 5,
  sab: 6,
  sabado: 6,
  sábado: 6,
};

/**
 * Calcula a próxima data de uma tarefa recorrente com base na data da ocorrência atual
 */
export function calculateNextRecurrenceDate(
  currentDateStr: string | null | undefined,
  recurrence: string | null | undefined
): string {
  if (!recurrence) {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return formatDate(d);
  }

  // Data base: usa a data agendada atual ou a data de hoje
  let baseDate: Date;
  if (currentDateStr && /^\d{4}-\d{2}-\d{2}$/.test(currentDateStr)) {
    const [y, m, d] = currentDateStr.split('-').map(Number);
    baseDate = new Date(y, m - 1, d);
  } else {
    baseDate = new Date();
  }

  const normRec = normalize(recurrence);

  // 1. Recorrência mensal por dia fixo: "todo dia 5", "todo dia 20", "dia 15"
  const dayOfMonthMatch = normRec.match(/(?:todo\s+dia|dia)\s+(\d{1,2})/);
  if (dayOfMonthMatch) {
    const targetDay = parseInt(dayOfMonthMatch[1], 10);
    let nextYear = baseDate.getFullYear();
    let nextMonth = baseDate.getMonth() + 1; // Próximo mês

    if (nextMonth > 11) {
      nextMonth = 0;
      nextYear += 1;
    }

    const clampedDay = clampDayToMonth(nextYear, nextMonth, targetDay);
    return formatDate(new Date(nextYear, nextMonth, clampedDay));
  }

  // 2. Fechamento de mês / Último dia do mês / Mensal
  if (
    normRec.includes('fechamento de mes') ||
    normRec.includes('ultimo dia') ||
    normRec === 'mensal'
  ) {
    let nextYear = baseDate.getFullYear();
    let nextMonth = baseDate.getMonth() + 1; // Próximo mês
    if (nextMonth > 11) {
      nextMonth = 0;
      nextYear += 1;
    }
    const lastDay = getLastDayOfMonth(nextYear, nextMonth);
    return formatDate(new Date(nextYear, nextMonth, lastDay));
  }

  // 3. Recorrência semanal por dia da semana: "toda seg", "toda segunda", "toda sexta"
  const weekdayMatch = normRec.match(
    /toda\s+(segunda|terca|quarta|quinta|sexta|sabado|domingo|seg|ter|qua|qui|sex|sab|dom)(?:-feira)?/
  );
  if (weekdayMatch) {
    const dayKey = weekdayMatch[1];
    const targetWeekday = WEEKDAYS_MAP[dayKey];

    if (targetWeekday !== undefined) {
      const nextDate = new Date(baseDate);
      // Avança pelo menos 1 dia para não ficar no mesmo dia
      nextDate.setDate(nextDate.getDate() + 1);

      let diff = targetWeekday - nextDate.getDay();
      if (diff < 0) {
        diff += 7;
      }
      nextDate.setDate(nextDate.getDate() + diff);
      return formatDate(nextDate);
    }
  }

  // 4. Diário: "todo dia", "diario", "diária"
  if (normRec.includes('diario') || normRec.includes('diaria') || normRec === 'todo dia') {
    const nextDate = new Date(baseDate);
    nextDate.setDate(nextDate.getDate() + 1);
    return formatDate(nextDate);
  }

  // 5. Intervalo de semanas: "a cada X semanas"
  const weeksMatch = normRec.match(/a cada (\d+) semanas?/);
  if (weeksMatch) {
    const weeksCount = parseInt(weeksMatch[1], 10);
    const nextDate = new Date(baseDate);
    nextDate.setDate(nextDate.getDate() + weeksCount * 7);
    return formatDate(nextDate);
  }

  // Fallback padrão: +7 dias
  const fallback = new Date(baseDate);
  fallback.setDate(fallback.getDate() + 7);
  return formatDate(fallback);
}

/**
 * Calcula a diferença em dias corridos entre duas datas YYYY-MM-DD
 * (positivo se targetDate for futuro em relação a todayStr)
 */
export function getDaysDifference(todayStr: string, targetDateStr: string): number {
  const [y1, m1, d1] = todayStr.split('-').map(Number);
  const [y2, m2, d2] = targetDateStr.split('-').map(Number);

  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);

  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((utc2 - utc1) / msPerDay);
}

export interface RecurrenceDueStatus {
  isDueToday: boolean;
  isWarning: boolean;
  daysRemaining: number;
  label: string | null;
}

/**
 * Verifica o status de exibição de um item na tela "Hoje":
 * - Se a data é hoje -> isDueToday: true
 * - Se a data é futura mas está na janela de aviso prévio (ex: 2 dias antes) -> isWarning: true
 * - Se a data é futura além do aviso -> não surge na tela Hoje!
 */
export function checkRecurrenceDueStatus(
  item: Item,
  todayStr: string
): RecurrenceDueStatus {
  if (!item.scheduled_date) {
    return {
      isDueToday: false,
      isWarning: false,
      daysRemaining: 0,
      label: null,
    };
  }

  if (item.scheduled_date === todayStr) {
    return {
      isDueToday: true,
      isWarning: false,
      daysRemaining: 0,
      label: 'Hoje',
    };
  }

  const daysDiff = getDaysDifference(todayStr, item.scheduled_date);

  // Se a data é futura
  if (daysDiff > 0) {
    const warningDays = item.advance_warning_days || 0;
    if (warningDays > 0 && daysDiff <= warningDays) {
      return {
        isDueToday: false,
        isWarning: true,
        daysRemaining: daysDiff,
        label:
          daysDiff === 1
            ? 'Vence amanhã'
            : `Aviso prévio: vence em ${daysDiff} dias`,
      };
    }
  }

  return {
    isDueToday: false,
    isWarning: false,
    daysRemaining: daysDiff,
    label: null,
  };
}

/**
 * Cria a próxima ocorrência para uma tarefa recorrente concluída
 */
export function createNextRecurrenceItem(completedItem: Item): Item {
  const nextDate = calculateNextRecurrenceDate(
    completedItem.scheduled_date,
    completedItem.recurrence
  );

  // Limpa o checklist de micro-etapas para a nova ocorrência
  const resetSubtasks = completedItem.subtasks?.map((st) => ({
    ...st,
    completed: false,
  }));

  const newId = `rec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  return {
    ...completedItem,
    id: newId,
    status: 'pending',
    scheduled_date: nextDate,
    completed_at: null,
    created_at: new Date().toISOString(),
    parent_recurrence_id: completedItem.parent_recurrence_id || completedItem.id,
    subtasks: resetSubtasks,
  };
}

/**
 * Retorna uma etiqueta formatada e legível para a recorrência
 */
export function formatRecurrenceLabel(recurrence: string | null | undefined): string {
  if (!recurrence) return '';
  const norm = normalize(recurrence);

  if (norm.includes('todo dia 5')) return 'Todo dia 5';
  if (norm.includes('todo dia 10')) return 'Todo dia 10';
  if (norm.includes('todo dia 15')) return 'Todo dia 15';
  if (norm.includes('todo dia 20')) return 'Todo dia 20';
  if (norm.includes('fechamento de mes') || norm.includes('ultimo dia')) {
    return 'Fechamento de mês';
  }
  if (norm.includes('toda seg')) return 'Toda segunda';
  if (norm.includes('toda ter')) return 'Toda terça';
  if (norm.includes('toda qua')) return 'Toda quarta';
  if (norm.includes('toda qui')) return 'Toda quinta';
  if (norm.includes('toda sex')) return 'Toda sexta';
  if (norm.includes('todo dia') || norm.includes('diario')) return 'Diário';

  // Capitaliza a primeira letra
  return recurrence.charAt(0).toUpperCase() + recurrence.slice(1);
}

/**
 * Verifica se um item é ritual ou recorrente
 */
export function isRecurringItem(item: Item): boolean {
  return Boolean(item.recurrence || item.is_recurring);
}
