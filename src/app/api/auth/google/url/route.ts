import { NextRequest, NextResponse } from 'next/server';
import { getCalendarAuth, saveCalendarAuth } from '@/lib/sqlite';
import { getGoogleAuthUrl } from '@/lib/googleCalendar';

export async function GET(req: NextRequest) {
  try {
    const auth = getCalendarAuth('google');
    const host = req.headers.get('host') || 'localhost:3000';
    const protocol = req.headers.get('x-forwarded-proto') || 'http';
    const redirectUri = `${protocol}://${host}/api/auth/google/callback`;

    if (!auth || !auth.client_id || !auth.client_secret) {
      return NextResponse.json({
        configured: false,
        connected: false,
        redirectUri,
      });
    }

    const authUrl = getGoogleAuthUrl(auth.client_id, redirectUri);
    const isConnected = !!(auth.access_token || auth.refresh_token);

    return NextResponse.json({
      configured: true,
      connected: isConnected,
      email: auth.account_email,
      clientId: auth.client_id,
      redirectUri,
      authUrl,
    });
  } catch (err: any) {
    console.error('Erro na rota /api/auth/google/url:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { client_id, client_secret } = body;

    if (!client_id || !client_secret) {
      return NextResponse.json(
        { error: 'client_id e client_secret são obrigatórios.' },
        { status: 400 }
      );
    }

    // Salva no SQLite local
    saveCalendarAuth({
      provider: 'google',
      client_id: client_id.trim(),
      client_secret: client_secret.trim(),
    });

    const host = req.headers.get('host') || 'localhost:3000';
    const protocol = req.headers.get('x-forwarded-proto') || 'http';
    const redirectUri = `${protocol}://${host}/api/auth/google/callback`;
    const authUrl = getGoogleAuthUrl(client_id.trim(), redirectUri);

    return NextResponse.json({
      success: true,
      authUrl,
      redirectUri,
    });
  } catch (err: any) {
    console.error('Erro ao salvar credenciais OAuth:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
