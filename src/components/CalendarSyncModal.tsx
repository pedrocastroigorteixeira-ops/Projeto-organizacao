'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Copy,
  Check,
  X,
  Smartphone,
  Shield,
  Unlink,
  Wifi,
  WifiOff,
  Clock,
  ChevronRight,
  Info,
} from 'lucide-react';
import { Item, Area } from '../types';

interface CalendarSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: Item[];
  areas: Area[];
  onItemsSynced?: (newItems: Item[]) => void;
  isOnline: boolean;
}

export function CalendarSyncModal({
  isOpen,
  onClose,
  items,
  areas,
  onItemsSynced,
  isOnline,
}: CalendarSyncModalProps) {
  const [activeTab, setActiveTab] = useState<'google' | 'apple'>('google');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState<{
    google: {
      configured: boolean;
      connected: boolean;
      email: string | null;
      clientId: string | null;
      updated_at: string | null;
    };
    apple: {
      feedUrl: string;
      webcalUrl: string;
    };
    outbox: {
      pendingCount: number;
    };
  } | null>(null);

  // Formulário de credenciais OAuth locais
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [copiedFeed, setCopiedFeed] = useState(false);
  const [copiedRedirect, setCopiedRedirect] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const redirectUri = typeof window !== 'undefined'
    ? `${window.location.origin}/api/auth/google/callback`
    : 'http://localhost:3000/api/auth/google/callback';

  const loadStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/sync/status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        if (!data.google.configured) {
          setShowConfigForm(true);
        }
      }
    } catch (err) {
      console.warn('Erro ao carregar status de sincronização:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadStatus();
    }
  }, [isOpen]);

  const handleSaveCredentialsAndConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId.trim() || !clientSecret.trim()) {
      setFeedbackMsg({ type: 'error', text: 'Preencha o Client ID e Client Secret gerados no Google Cloud.' });
      return;
    }

    try {
      setLoading(true);
      setFeedbackMsg(null);
      const res = await fetch('/api/auth/google/url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId.trim(),
          client_secret: clientSecret.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Erro ao salvar credenciais.');
      }

      setFeedbackMsg({ type: 'success', text: 'Credenciais gravadas no SQLite local! Redirecionando para autorização Google...' });
      // Redireciona para o consentimento OAuth oficial da Google
      window.location.href = data.authUrl;
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Falha ao salvar credenciais.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Deseja realmente desconectar o Google Calendar do banco SQLite local?')) return;

    try {
      setLoading(true);
      const res = await fetch('/api/sync/status', { method: 'DELETE' });
      if (res.ok) {
        setFeedbackMsg({ type: 'info', text: 'Integração Google Calendar desconectada com sucesso.' });
        loadStatus();
      }
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: 'Erro ao desconectar.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSyncNow = async () => {
    if (!isOnline) {
      setFeedbackMsg({
        type: 'info',
        text: 'Você está offline. As alterações continuam salvas no SQLite e sincronizarão assim que a rede voltar.',
      });
      return;
    }

    try {
      setSyncing(true);
      setFeedbackMsg(null);

      const res = await fetch('/api/sync/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao sincronizar com Google Calendar.');
      }

      let msg = `Sincronização concluída! `;
      if (data.pulledCount > 0) {
        msg += `${data.pulledCount} reunião(ões) baixadas do Google. `;
      }
      if (data.pushedCount > 0) {
        msg += `${data.pushedCount} compromisso(s) enviados para o Google.`;
      }
      if (data.pulledCount === 0 && data.pushedCount === 0) {
        msg += 'Tudo já está em dia.';
      }

      setFeedbackMsg({ type: 'success', text: msg });

      if (data.pulledItems && data.pulledItems.length > 0 && onItemsSynced) {
        onItemsSynced(data.pulledItems);
      }

      loadStatus();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Erro na sincronização.' });
    } finally {
      setSyncing(false);
    }
  };

  const copyToClipboard = (text: string, type: 'feed' | 'redirect') => {
    navigator.clipboard.writeText(text);
    if (type === 'feed') {
      setCopiedFeed(true);
      setTimeout(() => setCopiedFeed(false), 2000);
    } else {
      setCopiedRedirect(true);
      setTimeout(() => setCopiedRedirect(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#141418] border border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Cabeçalho do Modal */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-800 bg-[#18181D]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Sincronização de Calendário
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 font-normal">
                  <Shield className="w-3 h-3" /> SQLite Seguro Local
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Integre seus compromissos com o Google Calendar e Apple Calendar
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Status de Conexão & Offline */}
        <div className="px-5 py-2.5 bg-[#0f0f13] border-b border-neutral-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <Wifi className="w-3.5 h-3.5" /> Online (Pronto para sincronizar)
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-amber-400 font-medium">
                <WifiOff className="w-3.5 h-3.5" /> Modo Offline (Gravando localmente no SQLite)
              </span>
            )}
          </div>

          {status?.outbox?.pendingCount ? (
            <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 font-mono">
              {status.outbox.pendingCount} ação(ões) pendente(s) na fila
            </span>
          ) : (
            <span className="text-neutral-500 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Fila do SQLite vazia
            </span>
          )}
        </div>

        {/* Abas Provedores */}
        <div className="flex border-b border-neutral-800 px-5 pt-3 gap-2 bg-[#141418]">
          <button
            onClick={() => setActiveTab('google')}
            className={`pb-3 px-3 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'google'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Google Calendar
            {status?.google?.connected && (
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('apple')}
            className={`pb-3 px-3 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'apple'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            Apple Calendar (iPhone & Mac)
          </button>
        </div>

        {/* Mensagens de Feedback */}
        {feedbackMsg && (
          <div
            className={`mx-5 mt-4 p-3 rounded-xl text-xs flex items-center justify-between border ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60'
                : feedbackMsg.type === 'error'
                ? 'bg-rose-950/40 text-rose-300 border-rose-800/60'
                : 'bg-indigo-950/40 text-indigo-300 border-indigo-800/60'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedbackMsg.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
              {feedbackMsg.type === 'error' && <AlertTriangle className="w-4 h-4 shrink-0" />}
              {feedbackMsg.type === 'info' && <Info className="w-4 h-4 shrink-0" />}
              <span>{feedbackMsg.text}</span>
            </div>
            <button
              onClick={() => setFeedbackMsg(null)}
              className="text-neutral-400 hover:text-white ml-2"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Conteúdo com Scroll */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1 text-sm text-neutral-300">
          {activeTab === 'google' && (
            <div className="space-y-6">
              {/* Card de Status Conexão Google */}
              {status?.google?.connected ? (
                <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/40 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                        <Check className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-white flex items-center gap-2">
                          Google Calendar Conectado
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 uppercase tracking-wider font-semibold">
                            Ativo
                          </span>
                        </div>
                        <p className="text-xs text-neutral-400">
                          Conta: <span className="text-neutral-200 font-mono">{status.google.email || 'Autorizada'}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSyncNow}
                        disabled={syncing || !isOnline}
                        className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs flex items-center gap-1.5 shadow-sm transition-all"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                        {syncing ? 'Sincronizando...' : 'Sincronizar Agora'}
                      </button>

                      <button
                        onClick={handleDisconnect}
                        className="p-1.5 rounded-lg border border-neutral-700 hover:border-rose-700/60 text-neutral-400 hover:text-rose-400 hover:bg-rose-950/20 transition-colors"
                        title="Desconectar conta Google"
                      >
                        <Unlink className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 text-xs border-t border-neutral-800/60 text-neutral-400">
                    <div>
                      <span className="text-neutral-500 block">Sincronização Bidirecional:</span>
                      <span className="text-emerald-400 font-medium">Ativa (App ⇄ Google)</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block">Armazenamento de Tokens:</span>
                      <span className="text-neutral-300 font-medium">SQLite Local Criptografado</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-white">Conectar com Credenciais OAuth Locais</h3>
                      <p className="text-xs text-neutral-400">
                        Seus dados e tokens ficam 100% gravados no banco SQLite do seu computador, garantindo total privacidade e controle.
                      </p>
                    </div>

                    <button
                      onClick={() => setShowConfigForm(!showConfigForm)}
                      className="text-xs text-indigo-400 hover:text-indigo-300 underline font-medium"
                    >
                      {showConfigForm ? 'Ocultar Guia' : 'Ver Guia e Configurar'}
                    </button>
                  </div>

                  {/* Formulário de Configuração OAuth */}
                  {showConfigForm && (
                    <form onSubmit={handleSaveCredentialsAndConnect} className="space-y-4 pt-2 border-t border-neutral-800">
                      <div>
                        <label className="block text-xs font-semibold text-neutral-300 mb-1">
                          URI de Redirecionamento Autorizado (Cole no Google Cloud Console):
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={redirectUri}
                            className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs font-mono text-neutral-300 select-all"
                          />
                          <button
                            type="button"
                            onClick={() => copyToClipboard(redirectUri, 'redirect')}
                            className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs rounded-lg flex items-center gap-1.5 shrink-0 transition-colors"
                          >
                            {copiedRedirect ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            {copiedRedirect ? 'Copiado!' : 'Copiar'}
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-neutral-300 mb-1">
                            Client ID da Google:
                          </label>
                          <input
                            type="text"
                            placeholder="ex: 123456...apps.googleusercontent.com"
                            value={clientId}
                            onChange={(e) => setClientId(e.target.value)}
                            required
                            className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs font-mono text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-neutral-300 mb-1">
                            Client Secret da Google:
                          </label>
                          <input
                            type="password"
                            placeholder="ex: GOCSPX-..."
                            value={clientSecret}
                            onChange={(e) => setClientSecret(e.target.value)}
                            required
                            className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs font-mono text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="submit"
                          disabled={loading}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium flex items-center gap-2 shadow-sm transition-all"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Salvar no SQLite & Autorizar no Google
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* Guia Passo a Passo Oficial */}
              <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-3">
                <h4 className="text-xs font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-indigo-400" />
                  Passo a Passo: Como obter as credenciais no Google Cloud
                </h4>

                <ol className="space-y-2.5 text-xs text-neutral-400 list-decimal list-inside pl-1">
                  <li className="leading-relaxed">
                    Acesse o{' '}
                    <a
                      href="https://console.cloud.google.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-400 hover:underline inline-flex items-center gap-0.5"
                    >
                      Google Cloud Console <ExternalLink className="w-3 h-3" />
                    </a>{' '}
                    e crie um novo projeto (ex: <em>"Organização Pessoal"</em>).
                  </li>
                  <li className="leading-relaxed">
                    No menu lateral, vá em <strong>APIs e Serviços &gt; Biblioteca</strong>, procure por{' '}
                    <span className="text-neutral-200 font-medium">Google Calendar API</span> e clique em <strong>Ativar</strong>.
                  </li>
                  <li className="leading-relaxed">
                    Em <strong>Tela de permissão OAuth</strong>, selecione <em>Externo</em>, preencha o nome do app e em <strong>Usuários de teste</strong> adicione seu próprio Gmail.
                  </li>
                  <li className="leading-relaxed">
                    Adicione o escopo de permissão:{' '}
                    <code className="text-amber-400 font-mono bg-neutral-950 px-1 py-0.5 rounded">
                      .../auth/calendar.events
                    </code>.
                  </li>
                  <li className="leading-relaxed">
                    Em <strong>Credenciais &gt; Criar Credenciais &gt; ID do cliente OAuth</strong>, escolha o tipo{' '}
                    <span className="text-neutral-200 font-medium">Aplicativo da Web</span>.
                  </li>
                  <li className="leading-relaxed">
                    No campo <strong>URIs de redirecionamento autorizados</strong>, adicione exatamente o link de callback copiado acima:{' '}
                    <code className="text-indigo-300 font-mono bg-neutral-950 px-1 py-0.5 rounded">
                      {redirectUri}
                    </code>
                  </li>
                  <li className="leading-relaxed">
                    Copie o <strong>Client ID</strong> e o <strong>Client Secret</strong>, cole nos campos acima e clique em <em>Salvar no SQLite &amp; Autorizar</em>.
                  </li>
                </ol>
              </div>
            </div>
          )}

          {activeTab === 'apple' && (
            <div className="space-y-6">
              {/* Card de Assinatura iCalendar / Apple */}
              <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-white flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-indigo-400" />
                      Assinatura de Calendário Nativo Apple (iCal / Webcal)
                    </h3>
                    <p className="text-xs text-neutral-400 mt-1">
                      Conecte instantaneamente todos os seus compromissos e frentes ao aplicativo nativo Calendário do iPhone, iPad e Mac via feed RFC 5545.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    URL do Feed de Calendário (Assinatura iCal):
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={status?.apple?.feedUrl || `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/api/calendar/feed.ics`}
                      className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs font-mono text-neutral-300 select-all"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(
                          status?.apple?.feedUrl || `${window.location.origin}/api/calendar/feed.ics`,
                          'feed'
                        )
                      }
                      className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-lg flex items-center gap-1.5 shrink-0 transition-colors font-medium"
                    >
                      {copiedFeed ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedFeed ? 'Copiado!' : 'Copiar URL'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Como sincronizar no iPhone */}
              <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-3">
                <h4 className="text-xs font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  No iPhone ou iPad:
                </h4>
                <ol className="space-y-2 text-xs text-neutral-400 list-decimal list-inside pl-1">
                  <li>No iPhone, abra <strong>Ajustes &gt; Calendário &gt; Contas</strong>.</li>
                  <li>Toque em <strong>Adicionar Conta &gt; Outra &gt; Adicionar Calendário Assinado</strong>.</li>
                  <li>Cole a URL do feed copiada acima e toque em <strong>Seguinte</strong>.</li>
                  <li>Defina o nome como <em>"Sistema Organização &amp; Frentes"</em> e salve.</li>
                  <li>Pronto! Todos os compromissos aparecerão no app Calendário do iOS com as cores e horários.</li>
                </ol>
              </div>

              {/* Como sincronizar no Mac */}
              <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-3">
                <h4 className="text-xs font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-400" />
                  No Mac (macOS):
                </h4>
                <ol className="space-y-2 text-xs text-neutral-400 list-decimal list-inside pl-1">
                  <li>Abra o aplicativo <strong>Calendário</strong> no Mac.</li>
                  <li>Na barra de menus superior, clique em <strong>Arquivo &gt; Nova Assinatura de Calendário...</strong></li>
                  <li>Cole a URL do feed e clique em <strong>Assinar</strong>.</li>
                  <li>Escolha a frequência de atualização (ex: <em>A cada 15 minutos</em>) e clique em OK.</li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé do Modal */}
        <div className="p-4 border-t border-neutral-800 bg-[#18181D] flex items-center justify-between text-xs text-neutral-400">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-indigo-400" />
            <span>SQLite Local • Sem vazamento de dados na nuvem externa</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg font-medium transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
