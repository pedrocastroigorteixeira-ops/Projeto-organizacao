import { NextRequest, NextResponse } from 'next/server';
import {
  getCalendarAuth,
  deleteCalendarAuth,
  getPendingOutbox,
} from '@/lib/sqlite';

export async function GET(req: NextRequest) {
  try {
    const auth = getCalendarAuth('google');
    const outbox = getPendingOutbox();

    const host = req.headers.get('host') || 'localhost:3000';
    const protocol = req.headers.get('x-forwarded-proto') || 'http';
    const icalUrl = `${protocol}://${host}/api/calendar/feed.ics`;

    const isConnected = !!(auth && auth.is_active && (auth.access_token || auth.refresh_token));

    return NextResponse.json({
      google: {
        configured: !!(auth && auth.client_id),
        connected: isConnected,
        email: auth?.account_email || null,
        clientId: auth?.client_id ? `${auth.client_id.slice(0, 12)}...` : null,
        updated_at: auth?.updated_at || null,
      },
      apple: {
        feedUrl: icalUrl,
        webcalUrl: icalUrl.replace(/^http:\/\//, 'webcal://').replace(/^https:\/\//, 'webcal://'),
      },
      outbox: {
        pendingCount: outbox.length,
      },
    });
  } catch (err: any) {
    console.error('Erro na rota /api/sync/status:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    deleteCalendarAuth('google');
    return NextResponse.json({ success: true, message: 'Google Calendar desconectado do SQLite.' });
  } catch (err: any) {
    console.error('Erro ao desconectar Google Calendar:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
