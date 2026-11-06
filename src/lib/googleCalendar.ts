import {
  getCalendarAuth,
  saveCalendarAuth,
  getSyncMapping,
  saveSyncMapping,
  deleteSyncMapping,
} from './sqlite';

export interface GoogleEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  status?: string;
  htmlLink?: string;
  updated?: string;
}

/**
 * Gera URL de consentimento OAuth do Google
 */
export function getGoogleAuthUrl(clientId: string, redirectUri: string, state?: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/userinfo.email',
      'openid',
    ].join(' '),
    access_type: 'offline',
    prompt: 'consent',
  });

  if (state) {
    params.set('state', state);
  }

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Troca código OAuth por Access Token e Refresh Token
 */
export async function exchangeCodeForTokens(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  email?: string;
}> {
  const tokenUrl = 'https://oauth2.googleapis.com/token';

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Falha ao trocar código OAuth: ${res.status} - ${errorText}`);
  }

  const data = await res.json();

  // Tenta obter o e-mail da conta conectada via userinfo
  let email: string | undefined;
  try {
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    if (userRes.ok) {
      const userData = await userRes.json();
      email = userData.email;
    }
  } catch (e) {
    console.warn('Não foi possível obter email do usuário:', e);
  }

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
    email,
  };
}

/**
 * Renova o Access Token usando o Refresh Token
 */
export async function refreshAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<{ access_token: string; expires_in: number }> {
  const tokenUrl = 'https://oauth2.googleapis.com/token';

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Falha ao renovar token OAuth: ${res.status} - ${errText}`);
  }

  const data = await res.json();
  return {
    access_token: data.access_token,
    expires_in: data.expires_in,
  };
}

/**
 * Obtém um token de acesso válido garantido do SQLite
 */
export async function getValidAccessToken(): Promise<string | null> {
  const auth = getCalendarAuth('google');
  if (!auth || !auth.client_id || !auth.client_secret) {
    return null;
  }

  const now = Date.now();
  // Se o token ainda é válido por pelo menos 1 minuto (60000ms)
  if (auth.access_token && auth.expires_at && auth.expires_at > now + 60000) {
    return auth.access_token;
  }

  // Se tem refresh_token, renova
  if (auth.refresh_token) {
    try {
      const refreshed = await refreshAccessToken(
        auth.client_id,
        auth.client_secret,
        auth.refresh_token
      );

      const newExpiresAt = Date.now() + refreshed.expires_in * 1000;
      saveCalendarAuth({
        provider: 'google',
        client_id: auth.client_id,
        client_secret: auth.client_secret,
        access_token: refreshed.access_token,
        expires_at: newExpiresAt,
      });

      return refreshed.access_token;
    } catch (err) {
      console.error('Erro ao renovar token com Google OAuth:', err);
      return null;
    }
  }

  return auth.access_token || null;
}

/**
 * Busca eventos do Google Calendar em um intervalo de datas
 */
export async function fetchGoogleEvents(
  timeMin?: string,
  timeMax?: string
): Promise<GoogleEvent[]> {
  const token = await getValidAccessToken();
  if (!token) return [];

  const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
  url.searchParams.set('singleEvents', 'true');
  url.searchParams.set('orderBy', 'startTime');

  if (timeMin) url.searchParams.set('timeMin', timeMin);
  if (timeMax) url.searchParams.set('timeMax', timeMax);

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Erro ao listar eventos do Google Calendar: ${res.status}`);
  }

  const data = await res.json();
  return (data.items || []) as GoogleEvent[];
}

/**
 * Cria um evento no Google Calendar
 */
export async function insertGoogleEvent(event: {
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
}): Promise<GoogleEvent> {
  const token = await getValidAccessToken();
  if (!token) throw new Error('Não autenticado com o Google Calendar.');

  const res = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }
  );

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Falha ao criar evento no Google Calendar: ${res.status} - ${errorText}`);
  }

  return (await res.json()) as GoogleEvent;
}

/**
 * Atualiza um evento no Google Calendar
 */
export async function updateGoogleEvent(
  eventId: string,
  event: {
    summary?: string;
    description?: string;
    start?: { dateTime?: string; date?: string; timeZone?: string };
    end?: { dateTime?: string; date?: string; timeZone?: string };
  }
): Promise<GoogleEvent> {
  const token = await getValidAccessToken();
  if (!token) throw new Error('Não autenticado com o Google Calendar.');

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }
  );

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Falha ao atualizar evento no Google Calendar: ${res.status} - ${errorText}`);
  }

  return (await res.json()) as GoogleEvent;
}

/**
 * Deleta um evento no Google Calendar
 */
export async function deleteGoogleEvent(eventId: string): Promise<boolean> {
  const token = await getValidAccessToken();
  if (!token) throw new Error('Não autenticado com o Google Calendar.');

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (res.status === 404 || res.status === 410) {
    return true; // Já foi deletado
  }

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Falha ao remover evento no Google Calendar: ${res.status} - ${errorText}`);
  }

  return true;
}
