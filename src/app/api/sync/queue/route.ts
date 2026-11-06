import { NextRequest, NextResponse } from 'next/server';
import { queueOutboxAction, getCalendarAuth } from '@/lib/sqlite';

export async function POST(req: NextRequest) {
  try {
    const auth = getCalendarAuth('google');
    // Só enfileira se o Google Calendar estiver configurado
    if (!auth || !auth.is_active) {
      return NextResponse.json({ queued: false, reason: 'google_not_configured' });
    }

    const body = await req.json();
    const { itemId, action, payload } = body;

    if (!itemId || !action) {
      return NextResponse.json(
        { error: 'itemId e action são obrigatórios.' },
        { status: 400 }
      );
    }

    queueOutboxAction(itemId, action, payload || {});
    return NextResponse.json({ queued: true, itemId, action });
  } catch (err: any) {
    console.error('Erro ao enfileirar no outbox:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
