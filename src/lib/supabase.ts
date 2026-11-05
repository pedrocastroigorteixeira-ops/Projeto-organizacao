import { createClient, SupabaseClient } from '@supabase/supabase-js';

let cachedClient: SupabaseClient | null = null;
let lastUsedUrl = '';
let lastUsedKey = '';

export interface SupabaseConfig {
  url: string;
  key: string;
  source: 'env' | 'custom' | 'none';
}

export function getSupabaseConfig(): SupabaseConfig {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (
    envUrl &&
    envKey &&
    !envUrl.includes('seu-projeto') &&
    envUrl.startsWith('https://')
  ) {
    return { url: envUrl.trim(), key: envKey.trim(), source: 'env' };
  }

  if (typeof window !== 'undefined') {
    const customUrl = localStorage.getItem('supabase_custom_url');
    const customKey = localStorage.getItem('supabase_custom_key');
    if (customUrl && customKey && customUrl.startsWith('https://')) {
      return { url: customUrl.trim(), key: customKey.trim(), source: 'custom' };
    }
  }

  return { url: '', key: '', source: 'none' };
}

export function getSupabaseClient(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (config.source === 'none' || !config.url || !config.key) {
    return null;
  }

  if (cachedClient && lastUsedUrl === config.url && lastUsedKey === config.key) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(config.url, config.key, {
      auth: {
        persistSession: false,
      },
    });
    lastUsedUrl = config.url;
    lastUsedKey = config.key;
    return cachedClient;
  } catch (err) {
    console.error('Erro ao inicializar Supabase client:', err);
    return null;
  }
}

export function isSupabaseConnected(): boolean {
  return getSupabaseConfig().source !== 'none';
}
