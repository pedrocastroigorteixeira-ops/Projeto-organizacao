'use client';

import React, { useState, useEffect } from 'react';
import { Database, CheckCircle2, AlertCircle, Copy, ExternalLink, X, Key, Globe, Code } from 'lucide-react';
import { getSupabaseConfig, getSupabaseClient } from '../lib/supabase';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved: () => void;
}

export function SupabaseConfigModal({
  isOpen,
  onClose,
  onConfigSaved,
}: SupabaseConfigModalProps) {
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'sql'>('config');

  useEffect(() => {
    if (isOpen) {
      const config = getSupabaseConfig();
      setUrl(config.url || '');
      setKey(config.key || '');
      setStatusMessage(null);
    }
  }, [isOpen]);

  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !key.trim()) {
      setStatusMessage({
        type: 'error',
        text: 'Preencha a URL e a Anon Key do Supabase.',
      });
      return;
    }

    if (!url.startsWith('https://')) {
      setStatusMessage({
        type: 'error',
        text: 'A URL do Supabase deve começar com https://',
      });
      return;
    }

    setIsTesting(true);
    setStatusMessage({ type: 'info', text: 'Testando conexão com o Supabase...' });

    try {
      localStorage.setItem('supabase_custom_url', url.trim());
      localStorage.setItem('supabase_custom_key', key.trim());

      const client = getSupabaseClient();
      if (!client) {
        throw new Error('Não foi possível inicializar o cliente Supabase.');
      }

      // Teste rápido tentando listar frentes
      const { error } = await client.from('frentes').select('id').limit(1);

      if (error && error.code !== 'PGRST116') {
        setStatusMessage({
          type: 'error',
          text: `Conectou à API, mas a tabela 'frentes' ainda não existe ou falta permissão. Execute o script SQL no Supabase! (${error.message})`,
        });
      } else {
        setStatusMessage({
          type: 'success',
          text: 'Conexão com o Supabase estabelecida com sucesso! Seus dados sincronizarão em tempo real.',
        });
        setTimeout(() => {
          onConfigSaved();
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Erro ao conectar: ${err.message || 'Verifique sua URL e Chave'}.`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleClear = () => {
    localStorage.removeItem('supabase_custom_url');
    localStorage.removeItem('supabase_custom_key');
    setUrl('');
    setKey('');
    setStatusMessage({
      type: 'info',
      text: 'Configuração removida. O app voltou para o Modo Local.',
    });
    onConfigSaved();
  };

  const sqlCode = `-- Execute no SQL Editor do Supabase:
create table if not exists public.frentes (
  id text primary key,
  name text not null,
  slug text not null unique,
  color text not null,
  display_order int default 0,
  created_at timestamptz default now()
);

insert into public.frentes (id, name, slug, color, display_order)
values
  ('divino-pao', 'Divino Pão', 'divino', '#F59E0B', 1),
  ('bendito-sabor', 'Bendito Sabor', 'bendito', '#EF4444', 2),
  ('projetos', 'Projetos', 'proj', '#8B5CF6', 3),
  ('vida-pessoal', 'Vida Pessoal', 'pessoal', '#06B6D4', 4)
on conflict (id) do nothing;

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text not null default 'task' check (type in ('task', 'note')),
  area_id text references public.frentes(id) on delete set null,
  scheduled_date text,
  scheduled_time text,
  priority text not null default 'normal' check (priority in ('normal', 'high')),
  effort text check (effort is null or effort in ('quick', 'medium', 'long')),
  recurrence text,
  status text not null default 'pending' check (status in ('pending', 'completed', 'archived')),
  created_at timestamptz default now(),
  completed_at timestamptz
);

alter table public.frentes enable row level security;
alter table public.items enable row level security;

create policy "Acesso livre às frentes" on public.frentes for all using (true) with check (true);
create policy "Acesso livre aos items" on public.items for all using (true) with check (true);
alter publication supabase_realtime add table public.items;`;

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(sqlCode);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-[#141419] shadow-2xl">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-border/80 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Database className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">
                Sincronização Supabase
              </h2>
              <p className="text-xs text-gray-400">
                Sincronize celular e computador em tempo real
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-white/5 hover:text-gray-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Abas */}
        <div className="flex border-b border-border/80 bg-background/50 px-6 pt-2">
          <button
            onClick={() => setActiveTab('config')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'config'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            Configurar Chaves
          </button>
          <button
            onClick={() => setActiveTab('sql')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'sql'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            Script SQL (Banco de Dados)
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto p-6 space-y-5">
          {activeTab === 'config' ? (
            <>
              {/* OS 3 PASSOS EXPLICATIVOS */}
              <div className="rounded-xl border border-border bg-background/60 p-4 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                  Como pegar a URL e a Key no Supabase em 3 passos:
                </h3>
                <ol className="space-y-2 text-xs text-gray-300">
                  <li className="flex items-start gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-[10px] font-bold text-amber-300">
                      1
                    </span>
                    <span>
                      Acesse{' '}
                      <a
                        href="https://supabase.com/dashboard"
                        target="_blank"
                        rel="noreferrer"
                        className="text-amber-400 hover:underline inline-flex items-center gap-0.5"
                      >
                        supabase.com <ExternalLink className="h-3 w-3 inline" />
                      </a>{' '}
                      e entre no seu projeto (ou crie um gratuitamente).
                    </span>
                  </li>

                  <li className="flex items-start gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-[10px] font-bold text-amber-300">
                      2
                    </span>
                    <span>
                      No menu lateral esquerdo, clique em <strong>Project Settings</strong> (ícone de engrenagem) e depois na aba <strong>API</strong>.
                    </span>
                  </li>

                  <li className="flex items-start gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-[10px] font-bold text-amber-300">
                      3
                    </span>
                    <span>
                      Copie a <strong>Project URL</strong> e, em "Project API keys", copie a chave pública <strong>anon / public</strong>.
                    </span>
                  </li>
                </ol>
              </div>

              {/* Formulário de Configuração */}
              <form onSubmit={handleTestAndSave} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-300 flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5 text-gray-400" />
                    Supabase Project URL:
                  </label>
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://seu-projeto.supabase.co"
                    className="w-full rounded-xl bg-card border border-border px-3.5 py-2 text-sm text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-300 flex items-center gap-1.5">
                    <Key className="h-3.5 w-3.5 text-gray-400" />
                    Supabase Anon Key:
                  </label>
                  <input
                    type="password"
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full rounded-xl bg-card border border-border px-3.5 py-2 text-sm text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                  />
                </div>

                {/* Mensagens de Status */}
                {statusMessage && (
                  <div
                    className={`rounded-xl p-3 text-xs flex items-start gap-2 border ${
                      statusMessage.type === 'success'
                        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                        : statusMessage.type === 'error'
                        ? 'bg-red-500/10 text-red-300 border-red-500/30'
                        : 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                    }`}
                  >
                    {statusMessage.type === 'success' ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                    ) : (
                      <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                    )}
                    <span>{statusMessage.text}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={handleClear}
                    className="text-xs text-gray-400 hover:text-red-400 transition-colors"
                  >
                    Usar Modo Local (Resetar)
                  </button>

                  <button
                    type="submit"
                    disabled={isTesting}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-xs font-semibold text-black shadow-md hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all"
                  >
                    {isTesting ? 'Verificando...' : 'Salvar e Conectar'}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-300">
                  Execute este script no <strong>SQL Editor</strong> do Supabase para criar as tabelas e frentes:
                </span>
                <button
                  onClick={copySqlToClipboard}
                  className="flex items-center gap-1.5 rounded-lg bg-surface px-3 py-1.5 text-xs text-amber-400 border border-border hover:bg-surface-hover"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>{copiedSql ? 'Copiado!' : 'Copiar SQL'}</span>
                </button>
              </div>

              <pre className="max-h-72 overflow-x-auto rounded-xl bg-background p-4 text-[11px] text-gray-300 font-mono border border-border">
                {sqlCode}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
