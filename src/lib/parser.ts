import { Area, EffortType, ItemType, ParsedCapture, PriorityType } from '../types';
import { INITIAL_AREAS, EFFORT_LABELS } from './constants';

function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Retorna uma data no formato YYYY-MM-DD no fuso local
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Converte 'YYYY-MM-DD' em data legível pt-BR (ex: "Hoje", "Amanhã", "sex, 25/11")
 */
export function formatFriendlyDate(dateStr: string | null): string {
  if (!dateStr) return 'Sem data';

  const todayStr = formatDate(new Date());
  if (dateStr === todayStr) return 'Hoje';

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = formatDate(tomorrow);
  if (dateStr === tomorrowStr) return 'Amanhã';

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = formatDate(yesterday);
  if (dateStr === yesterdayStr) return 'Ontem (Atrasada)';

  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  const weekday = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
  return `${weekday}, ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`;
}

export function parseQuickCapture(
  input: string,
  availableAreas: Area[] = INITIAL_AREAS
): ParsedCapture {
  const rawInput = input.trim();
  if (!rawInput) {
    return {
      cleanTitle: '',
      rawInput: '',
      area: null,
      unrecognizedArea: null,
      scheduledDate: null,
      scheduledTime: null,
      dateLabel: null,
      priority: 'normal',
      effort: null,
      effortLabel: null,
      type: 'task',
      recurrence: null,
      isInbox: true,
    };
  }

  // Adiciona espaços nas pontas para facilitar regex com lookaround de limites de palavra
  let textWorking = ` ${rawInput} `;

  // 1. Tipo: :nota ou :ideia
  let itemType: ItemType = 'task';
  const typeRegex = /(?<=^|\s)(:nota|:ideia|:idea)(?=\s|$)/iu;
  const typeMatch = textWorking.match(typeRegex);
  if (typeMatch) {
    itemType = 'note';
    textWorking = textWorking.replace(typeRegex, ' ');
  }

  // 2. Prioridade alta: !!
  let priority: PriorityType = 'normal';
  if (/!!/.test(textWorking)) {
    priority = 'high';
    textWorking = textWorking.replace(/!!+/g, ' ');
  }

  // 3. Esforço: :rapida, :media, :longa (com ou sem acento)
  let effort: EffortType | null = null;
  let effortLabel: string | null = null;

  const quickEffortRegex = /(?<=^|\s)(:rapida|:r[aá]pida)(?=\s|$)/iu;
  const mediumEffortRegex = /(?<=^|\s)(:media|:m[eé]dia)(?=\s|$)/iu;
  const longEffortRegex = /(?<=^|\s)(:longa)(?=\s|$)/iu;

  if (quickEffortRegex.test(textWorking)) {
    effort = 'quick';
    effortLabel = EFFORT_LABELS.quick.label;
    textWorking = textWorking.replace(quickEffortRegex, ' ');
  } else if (mediumEffortRegex.test(textWorking)) {
    effort = 'medium';
    effortLabel = EFFORT_LABELS.medium.label;
    textWorking = textWorking.replace(mediumEffortRegex, ' ');
  } else if (longEffortRegex.test(textWorking)) {
    effort = 'long';
    effortLabel = EFFORT_LABELS.long.label;
    textWorking = textWorking.replace(longEffortRegex, ' ');
  }

  // 4. Recorrência: 'toda seg', 'todo dia 5', 'todo dia 15', 'a cada X semanas'
  let recurrence: string | null = null;
  const recurrenceRegex = /(?<=^|\s)(todo\s+dia\s+\d{1,2}|toda\s+(?:segunda|ter[cç]a|quarta|quinta|sexta|s[aá]bado|domingo|seg|ter|qua|qui|sex|s[aá]b|dom)(?:-feira)?|a\s+cada\s+\d+\s+semanas(?:\s+na\s+\w+)?)(?=\s|$)/iu;
  const recurrenceMatch = textWorking.match(recurrenceRegex);
  if (recurrenceMatch) {
    recurrence = recurrenceMatch[1].trim();
    textWorking = textWorking.replace(recurrenceRegex, ' ');
  }

  // 5. Frente / Empresa com hashtag: #divino, #bendito, #proj, #pessoal
  let area: Area | null = null;
  let unrecognizedArea: string | null = null;

  const hashtagMatch = textWorking.match(/(?<=^|\s)#([a-zA-Z0-9À-ÿ_-]+)(?=\s|$)/u);
  if (hashtagMatch) {
    const rawTag = hashtagMatch[1];
    const normalizedTag = normalizeString(rawTag);

    // Encontrar frente que comece com o slug ou o nome
    const matchedArea = availableAreas.find((a) => {
      const aSlug = normalizeString(a.slug);
      const aName = normalizeString(a.name);
      return (
        aSlug.startsWith(normalizedTag) ||
        normalizedTag.startsWith(aSlug) ||
        aName.startsWith(normalizedTag)
      );
    });

    if (matchedArea) {
      area = matchedArea;
    } else {
      unrecognizedArea = `#${rawTag}`;
    }

    // Remove a hashtag do texto
    textWorking = textWorking.replace(hashtagMatch[0], ' ');
  }

  // 6. Horário: 14h, 18h, 14:30, 14h30, 9h
  let scheduledTime: string | null = null;
  const timeRegex = /(?<=^|\s)(\d{1,2})(?:h|:)(\d{2})?(?=\s|$)/iu;
  const timeMatch = textWorking.match(timeRegex);
  if (timeMatch) {
    const hour = parseInt(timeMatch[1], 10);
    const minute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      scheduledTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      textWorking = textWorking.replace(timeRegex, ' ');
    }
  }

  // 7. Data: hoje, amanhã, sex, próxima qua, 25/11, etc.
  let scheduledDate: string | null = null;
  let dateLabel: string | null = null;

  const now = new Date();
  const currentDay = now.getDay(); // 0 = dom, 1 = seg...

  // Regex para data numérica DD/MM ou DD/MM/AAAA
  const numericDateRegex = /(?<=^|\s)(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?(?=\s|$)/u;
  const numMatch = textWorking.match(numericDateRegex);

  const hojeRegex = /(?<=^|\s)hoje(?=\s|$)/iu;
  const amanhaRegex = /(?<=^|\s)(amanh[aã]|amanha)(?=\s|$)/iu;

  if (numMatch) {
    const day = parseInt(numMatch[1], 10);
    const month = parseInt(numMatch[2], 10);
    let year = numMatch[3] ? parseInt(numMatch[3], 10) : now.getFullYear();
    if (year < 100) year += 2000;

    const targetDate = new Date(year, month - 1, day);
    scheduledDate = formatDate(targetDate);
    dateLabel = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`;
    textWorking = textWorking.replace(numericDateRegex, ' ');
  } else if (hojeRegex.test(textWorking)) {
    scheduledDate = formatDate(now);
    dateLabel = 'Hoje';
    textWorking = textWorking.replace(hojeRegex, ' ');
  } else if (amanhaRegex.test(textWorking)) {
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    scheduledDate = formatDate(tomorrow);
    dateLabel = 'Amanhã';
    textWorking = textWorking.replace(amanhaRegex, ' ');
  } else {
    // Dias da semana: seg, ter, qua, qui, sex, sab, dom
    const daysMap: Record<string, number> = {
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

    const weekdayRegex = /(?<=^|\s)(?:(pr[oó]xima|proxima)\s+)?(segunda|ter[cç]a|quarta|quinta|sexta|s[aá]bado|domingo|seg|ter|qua|qui|sex|s[aá]b|dom)(?:-feira)?(?=\s|$)/iu;
    const weekMatch = textWorking.match(weekdayRegex);

    if (weekMatch) {
      const isNext = Boolean(weekMatch[1]);
      const dayToken = normalizeString(weekMatch[2]);
      const targetDay = daysMap[dayToken];

      if (targetDay !== undefined) {
        let diff = targetDay - currentDay;
        if (diff < 0) {
          diff += 7;
        } else if (diff === 0 && isNext) {
          diff = 7;
        } else if (diff === 0 && !isNext) {
          diff = 0;
        } else if (isNext) {
          diff += 7;
        }

        const targetDate = new Date(now);
        targetDate.setDate(now.getDate() + diff);
        scheduledDate = formatDate(targetDate);
        dateLabel = formatFriendlyDate(scheduledDate);
        textWorking = textWorking.replace(weekdayRegex, ' ');
      }
    }
  }

  // Se tem recorrência do tipo "todo dia X" e não tem scheduledDate explícito, calcula a próxima data do dia X
  if (recurrence && !scheduledDate) {
    const dayMatch = recurrence.match(/todo\s+dia\s+(\d{1,2})/i);
    if (dayMatch) {
      const dayNum = parseInt(dayMatch[1], 10);
      const targetDate = new Date(now.getFullYear(), now.getMonth(), dayNum);
      if (targetDate < now) {
        targetDate.setMonth(targetDate.getMonth() + 1);
      }
      scheduledDate = formatDate(targetDate);
      dateLabel = `Todo dia ${dayNum}`;
    }
  }

  // Limpa o título restante
  let cleanTitle = textWorking
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[-–—,.:;\s]+|[-–—,.:;\s]+$/g, '');

  // Se por algum motivo o título ficou vazio (ex: só digitou hashtags/flags), recupera texto bruto
  if (!cleanTitle && rawInput) {
    cleanTitle = rawInput;
  }

  // Regra de destino:
  // "Texto sem data ou sem frente vai pro Inbox para eu analisar em casa depois."
  const isInbox = !area || !scheduledDate;

  return {
    cleanTitle,
    rawInput,
    area,
    unrecognizedArea,
    scheduledDate,
    scheduledTime,
    dateLabel: dateLabel || (scheduledDate ? formatFriendlyDate(scheduledDate) : null),
    priority,
    effort,
    effortLabel,
    type: itemType,
    recurrence,
    isInbox,
  };
}
