import { NextRequest, NextResponse } from 'next/server';
import {
  getCalendarAuth,
  getSyncMapping,
  getSyncMappingByExternalId,
  saveSyncMapping,
  deleteSyncMapping,
  getPendingOutbox,
  updateOutboxStatus,
  clearSyncedOutbox,
} from '@/lib/sqlite';
import {
  fetchGoogleEvents,
  insertGoogleEvent,
  updateGoogleEvent,
  deleteGoogleEvent,
} from '@/lib/googleCalendar';
import { Item } from '@/types';

function parseGoogleDateTime(dateTimeStr?: string, dateStr?: string): {
  date: string | null;
  time: string | null;
} {
  if (dateTimeStr) {
    // Ex: "2026-11-06T14:30:00-03:00" ou "2026-11-06T17:30:00Z"
    const d = new Date(dateTimeStr);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return {
      date: `${year}-${month}-${day}`,
      time: `${hours}:${minutes}`,
    };
  }

  if (dateStr) {
    // Evento de dia inteiro (YYYY-MM-DD)
    return {
      date: dateStr,
      time: null,
    };
  }

  return { date: null, time: null };
}

export async function POST(req: NextRequest) {
  try {
    const auth = getCalendarAuth('google');
    if (!auth || !auth.is_active || (!auth.access_token && !auth.refresh_token)) {
      return NextResponse.json(
        { error: 'Google Calendar não está conectado no SQLite local.' },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const clientItems: Item[] = body.items || [];

    let pushedCount = 0;
    let pulledCount = 0;
    const pulledItems: Item[] = [];

    // ==========================================
    // 1. PUSH: Processa a Fila do Outbox (Offline Sync)
    // ==========================================
    const pendingOutbox = getPendingOutbox();

    for (const record of pendingOutbox) {
      try {
        updateOutboxStatus(record.id, 'processing');
        const payload = JSON.parse(record.payload);
        const existingMapping = getSyncMapping(record.item_id);

        if (record.action === 'delete') {
          if (existingMapping) {
            await deleteGoogleEvent(existingMapping.external_id);
            deleteSyncMapping(record.item_id);
          }
        } else if (record.action === 'insert' || record.action === 'update') {
          if (payload.scheduled_date) {
            let startDateTime: string | undefined;
            let endDateTime: string | undefined;
            let startDate: string | undefined;
            let endDate: string | undefined;

            if (payload.scheduled_time) {
              const [h, m] = payload.scheduled_time.split(':').map(Number);
              const duration = payload.effort === 'quick' ? 30 : payload.effort === 'long' ? 120 : 60;
              const [yr, mo, da] = payload.scheduled_date.split('-').map(Number);
              const startObj = new Date(yr, mo - 1, da, h, m, 0);
              const endObj = new Date(startObj.getTime() + duration * 60000);
              startDateTime = startObj.toISOString();
              endDateTime = endObj.toISOString();
            } else {
              startDate = payload.scheduled_date;
              endDate = payload.scheduled_date;
            }

            const eventBody = {
              summary: payload.title,
              description: payload.decision_rationale
                ? `Racional da Decisão: ${payload.decision_rationale}\n\n${payload.content || ''}`
                : payload.content || '',
              start: startDateTime ? { dateTime: startDateTime } : { date: startDate },
              end: endDateTime ? { dateTime: endDateTime } : { date: endDate },
            };

            if (existingMapping) {
              const updated = await updateGoogleEvent(existingMapping.external_id, eventBody);
              saveSyncMapping(record.item_id, updated.id, 'google', updated.updated);
            } else {
              const created = await insertGoogleEvent(eventBody);
              saveSyncMapping(record.item_id, created.id, 'google', created.updated);
            }
          }
        }

        updateOutboxStatus(record.id, 'synced');
        pushedCount++;
      } catch (err: any) {
        console.error(`Erro ao processar item ${record.id} do outbox:`, err);
        updateOutboxStatus(record.id, 'failed', err.message);
      }
    }

    clearSyncedOutbox();

    // ==========================================
    // 2. PUSH de itens do cliente agendados que ainda não têm mapeamento
    // ==========================================
    for (const item of clientItems) {
      if (item.scheduled_date && item.status !== 'archived') {
        const mapping = getSyncMapping(item.id);
        if (!mapping) {
          try {
            let startDateTime: string | undefined;
            let endDateTime: string | undefined;
            let startDate: string | undefined;
            let endDate: string | undefined;

            if (item.scheduled_time) {
              const [h, m] = item.scheduled_time.split(':').map(Number);
              const duration = item.effort === 'quick' ? 30 : item.effort === 'long' ? 120 : 60;
              const [yr, mo, da] = item.scheduled_date.split('-').map(Number);
              const startObj = new Date(yr, mo - 1, da, h, m, 0);
              const endObj = new Date(startObj.getTime() + duration * 60000);
              startDateTime = startObj.toISOString();
              endDateTime = endObj.toISOString();
            } else {
              startDate = item.scheduled_date;
              endDate = item.scheduled_date;
            }

            const eventBody = {
              summary: item.title,
              description: item.content || item.decision_rationale || '',
              start: startDateTime ? { dateTime: startDateTime } : { date: startDate },
              end: endDateTime ? { dateTime: endDateTime } : { date: endDate },
            };

            const created = await insertGoogleEvent(eventBody);
            saveSyncMapping(item.id, created.id, 'google', created.updated);
            pushedCount++;
          } catch (e) {
            console.warn('Falha no push individual do item:', item.title, e);
          }
        }
      }
    }

    // ==========================================
    // 3. PULL: Busca eventos externos criados no celular/Google Calendar
    // ==========================================
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const timeMin = today.toISOString();

    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + 14); // Próximos 14 dias
    maxDate.setHours(23, 59, 59, 999);
    const timeMax = maxDate.toISOString();

    const googleEvents = await fetchGoogleEvents(timeMin, timeMax);

    for (const gEvent of googleEvents) {
      if (gEvent.status === 'cancelled') continue;

      const mapping = getSyncMappingByExternalId(gEvent.id);
      const parsedTime = parseGoogleDateTime(gEvent.start?.dateTime, gEvent.start?.date);

      if (!mapping) {
        // Novo evento criado remotamente (ex: reunião marcada no celular)
        // Detecta frente de negócio pelo título se contiver hashtag ou palavra-chave
        const titleLower = (gEvent.summary || '').toLowerCase();
        let areaId: string | null = 'vida-pessoal'; // padrão para eventos externos

        if (titleLower.includes('divino') || titleLower.includes('#divino')) {
          areaId = 'divino-pao';
        } else if (titleLower.includes('bendito') || titleLower.includes('#bendito')) {
          areaId = 'bendito-sabor';
        } else if (titleLower.includes('projeto') || titleLower.includes('#proj')) {
          areaId = 'projetos';
        }

        const newItemId = `gcal_${gEvent.id}`;
        const newItem: Item = {
          id: newItemId,
          title: gEvent.summary || '(Sem título)',
          content: gEvent.description || undefined,
          type: 'task',
          area_id: areaId,
          scheduled_date: parsedTime.date,
          scheduled_time: parsedTime.time,
          priority: 'normal',
          effort: 'quick',
          recurrence: null,
          status: 'pending',
          created_at: gEvent.updated || new Date().toISOString(),
          completed_at: null,
          tags: ['@google-calendar'],
        };

        pulledItems.push(newItem);
        saveSyncMapping(newItemId, gEvent.id, 'google', gEvent.updated);
        pulledCount++;
      }
    }

    return NextResponse.json({
      success: true,
      pushedCount,
      pulledCount,
      pulledItems,
      syncedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Erro na sincronização bidirecional:', err);
    return NextResponse.json(
      { error: err.message || 'Erro interno na sincronização.' },
      { status: 500 }
    );
  }
}
