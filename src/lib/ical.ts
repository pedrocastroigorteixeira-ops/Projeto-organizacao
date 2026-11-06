import { Item, Area } from '../types';

/**
 * Formata data e hora para o padrão iCalendar UTC (ex: 20261105T140000Z)
 */
function toICalDateTime(dateStr: string, timeStr?: string | null): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  let hours = 9;
  let minutes = 0;

  if (timeStr) {
    const parts = timeStr.split(':').map(Number);
    hours = parts[0];
    minutes = parts[1] || 0;
  }

  const d = new Date(year, month - 1, day, hours, minutes, 0);
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

/**
 * Adiciona minutos a uma string iCalendar
 */
function addMinutesToICal(dateStr: string, timeStr: string | null, minutesToAdd: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  let hours = 9;
  let minutes = 0;

  if (timeStr) {
    const parts = timeStr.split(':').map(Number);
    hours = parts[0];
    minutes = parts[1] || 0;
  }

  const d = new Date(year, month - 1, day, hours, minutes + minutesToAdd, 0);
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

/**
 * Gera arquivo RFC 5545 iCalendar (.ics) compatível com Apple Calendar e Google Calendar
 */
export function generateICalFeed(items: Item[], areas: Area[]): string {
  const areaMap = new Map<string, Area>();
  areas.forEach((a) => areaMap.set(a.id, a));

  const scheduledItems = items.filter(
    (item) => item.scheduled_date && item.status !== 'archived'
  );

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Antigravity//Sistema Organizacao 2026//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Sistema de Organização & Frentes',
    'X-WR-TIMEZONE:America/Sao_Paulo',
    'REFRESH-INTERVAL;VALUE=DURATION:PT15M',
    'X-PUBLISHED-TTL:PT15M',
  ];

  for (const item of scheduledItems) {
    const area = item.area_id ? areaMap.get(item.area_id) : null;
    const startStr = toICalDateTime(item.scheduled_date!, item.scheduled_time);
    const durationMinutes = item.effort === 'quick' ? 30 : item.effort === 'long' ? 120 : 60;
    const endStr = addMinutesToICal(item.scheduled_date!, item.scheduled_time, durationMinutes);

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${item.id}@sistemaorganizacao.local`);
    lines.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`);
    lines.push(`DTSTART:${startStr}`);
    lines.push(`DTEND:${endStr}`);
    lines.push(`SUMMARY:${item.title}${area ? ` [${area.name}]` : ''}`);

    if (item.content || item.decision_rationale) {
      const desc = (item.decision_rationale ? `Racional: ${item.decision_rationale}\n\n` : '') +
        (item.content || '');
      lines.push(`DESCRIPTION:${desc.replace(/\n/g, '\\n')}`);
    }

    if (area) {
      lines.push(`CATEGORIES:${area.name}`);
    }

    if (item.priority === 'high') {
      lines.push('PRIORITY:1');
    }

    lines.push('STATUS:CONFIRMED');
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
