import { NextRequest, NextResponse } from 'next/server';
import { getCalendarAuth, saveCalendarAuth } from '@/lib/sqlite';
import { exchangeCodeForTokens } from '@/lib/googleCalendar';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    const host = req.headers.get('host') || 'localhost:3000';
    const protocol = req.headers.get('x-forwarded-proto') || 'http';
    const redirectUri = `${protocol}://${host}/api/auth/google/callback`;

    if (error) {
      return NextResponse.redirect(
        new URL(`/?calendar_error=${encodeURIComponent(error)}`, req.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/?calendar_error=codigo_nao_fornecido', req.url)
      );
    }

    const auth = getCalendarAuth('google');
    if (!auth || !auth.client_id || !auth.client_secret) {
      return NextResponse.redirect(
        new URL('/?calendar_error=credenciais_locais_nao_encontradas', req.url)
      );
    }

    // Troca código por tokens
    const tokens = await exchangeCodeForTokens(
      code,
      auth.client_id,
      auth.client_secret,
      redirectUri
    );

    const expiresAt = Date.now() + tokens.expires_in * 1000;

    // Grava de forma segura no SQLite local
    saveCalendarAuth({
      provider: 'google',
      client_id: auth.client_id,
      client_secret: auth.client_secret,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || auth.refresh_token,
      expires_at: expiresAt,
      account_email: tokens.email || auth.account_email,
      is_active: 1,
    });

    return NextResponse.redirect(
      new URL('/?calendar_connected=sucesso', req.url)
    );
  } catch (err: any) {
    console.error('Erro no callback OAuth:', err);
    return NextResponse.redirect(
      new URL(`/?calendar_error=${encodeURIComponent(err.message || 'falha_oauth')}`, req.url)
    );
  }
}
