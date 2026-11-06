'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Archive,
  FileCode,
  HardDrive,
  Calendar,
  Sparkles,
  Info,
  Check,
  X,
} from 'lucide-react';
import { BackupFileInfo } from '../lib/backup';
import { getSupabaseConfig, getSupabaseClient } from '../lib/supabase';

interface SettingsAndBackupViewProps {
  onDataRestored?: () => void;
  onOpenCalendarSync?: () => void;
}

export function SettingsAndBackupView({
  onDataRestored,
  onOpenCalendarSync,
}: SettingsAndBackupViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<'backup' | 'supabase'>('backup');
  const [backups, setBackups] = useState<BackupFileInfo[]>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
    safetyBackup?: string;
  } | null>(null);

  // Confirmação de restauração
  const [confirmRestoreFile, setConfirmRestoreFile] = useState<string | null>(null);

  // Upload input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Supabase states
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [isTestingSupabase, setIsTestingSupabase] = useState(false);
  const [supabaseFeedback, setSupabaseFeedback] = useState<string | null>(null);

  const loadBackups = async () => {
    try {
      setIsLoadingBackups(true);
      const res = await fetch('/api/backup/list');
      if (res.ok) {
        const data = await res.json();
        setBackups(data.backups || []);
      }
    } catch (err) {
      console.warn('Erro ao carregar lista de backups:', err);
    } finally {
      setIsLoadingBackups(false);
    }
  };

  useEffect(() => {
    loadBackups();
    const config = getSupabaseConfig();
    setSupabaseUrl(config.url || '');
    setSupabaseKey(config.key || '');
  }, []);

  const handleExport = (format: 'sqlite' | 'json') => {
    const downloadUrl = `/api/backup/export?format=${format}`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = '';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setFeedback({
      type: 'success',
      text: `Exportação da base completa (${format === 'sqlite' ? 'SQLite .db.gz' : 'JSON'}) iniciada!`,
    });
  };

  const handleCreateManualBackup = async () => {
    try {
      setIsProcessing(true);
      setFeedback(null);
      const res = await fetch('/api/backup/create', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao criar backup.');

      setFeedback({
        type: 'success',
        text: `Backup manual gerado com sucesso: ${data.backup?.filename} (${data.backup?.sizeFormatted})`,
      });
      loadBackups();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Erro ao gerar backup.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestoreFromHistory = async (filename: string) => {
    try {
      setIsProcessing(true);
      setFeedback(null);
      const res = await fetch('/api/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao restaurar backup.');

      setFeedback({
        type: 'success',
        text: `Base restaurada com sucesso a partir de "${filename}"!`,
        safetyBackup: data.safetyBackup?.filename,
      });

      setConfirmRestoreFile(null);
      loadBackups();
      if (onDataRestored) onDataRestored();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Erro na restauração.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm(`TRAVA DE SEGURANÇA ATIVA: Uma cópia do estado atual será gerada antes de restaurar o arquivo "${file.name}". Deseja continuar?`)) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      setIsProcessing(true);
      setFeedback(null);

      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/backup/restore', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao restaurar arquivo enviado.');

      setFeedback({
        type: 'success',
        text: `Restauração concluída com sucesso a partir de "${file.name}"!`,
        safetyBackup: data.safetyBackup?.filename,
      });

      loadBackups();
      if (onDataRestored) onDataRestored();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Erro ao restaurar do upload.' });
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveSupabase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabaseUrl.trim() || !supabaseKey.trim()) {
      setSupabaseFeedback('Preencha a URL e a Anon Key do Supabase.');
      return;
    }

    try {
      setIsTestingSupabase(true);
      localStorage.setItem('supabase_custom_url', supabaseUrl.trim());
      localStorage.setItem('supabase_custom_key', supabaseKey.trim());

      const client = getSupabaseClient();
      if (!client) throw new Error('Não foi possível inicializar o cliente Supabase.');

      const { error } = await client.from('frentes').select('id').limit(1);
      if (error && error.code !== 'PGRST116') {
        setSupabaseFeedback(`Conectado à API, mas verifique o schema da tabela 'frentes': ${error.message}`);
      } else {
        setSupabaseFeedback('Conexão com o Supabase estabelecida com sucesso!');
        if (onDataRestored) onDataRestored();
      }
    } catch (err: any) {
      setSupabaseFeedback(`Erro: ${err.message || 'Falha na conexão'}`);
    } finally {
      setIsTestingSupabase(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Cabeçalho da Aba */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <HardDrive className="h-6 w-6 text-indigo-400" />
            <span>Configurações &amp; Backup Local</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Gestão da base SQLite local, rotina de backup diário, histórico dos últimos 30 dias e trava de segurança.
          </p>
        </div>

        {/* Abas Superiores */}
        <div className="flex items-center gap-1 rounded-xl bg-surface p-1 border border-border self-start sm:self-auto">
          <button
            onClick={() => setActiveSubTab('backup')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'backup'
                ? 'bg-card text-white shadow-sm border border-border'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Archive className="w-3.5 h-3.5 text-indigo-400" />
            <span>Backup &amp; SQLite</span>
          </button>

          <button
            onClick={() => setActiveSubTab('supabase')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'supabase'
                ? 'bg-card text-white shadow-sm border border-border'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>Nuvem (Supabase)</span>
          </button>
        </div>
      </div>

      {/* Alerta de Feedback */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs flex items-start justify-between border ${
            feedback.type === 'success'
              ? 'bg-emerald-950/40 text-emerald-200 border-emerald-800/60'
              : feedback.type === 'error'
              ? 'bg-rose-950/40 text-rose-200 border-rose-800/60'
              : 'bg-indigo-950/40 text-indigo-200 border-indigo-800/60'
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-semibold">
              {feedback.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />}
              {feedback.type === 'error' && <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />}
              {feedback.type === 'info' && <Info className="w-4 h-4 shrink-0 text-indigo-400" />}
              <span>{feedback.text}</span>
            </div>

            {feedback.safetyBackup && (
              <p className="text-[11px] text-emerald-400 font-mono pl-6">
                🛡️ Cópia preventiva gerada automaticamente: <strong>{feedback.safetyBackup}</strong>
              </p>
            )}
          </div>

          <button onClick={() => setFeedback(null)} className="text-gray-400 hover:text-white ml-3">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {activeSubTab === 'backup' && (
        <div className="space-y-6">
          {/* Card Principal: Rotina Automática Diária & Trava de Segurança */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 p-5 rounded-2xl bg-[#141419] border border-border space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                    <HardDrive className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
                      Rotina de Backup Diário Automático
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider font-semibold">
                        Ativa
                      </span>
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Compacta e salva a base SQLite em <code className="text-indigo-300 font-mono">data/backups/</code> com histórico dos últimos 30 dias.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleCreateManualBackup}
                  disabled={isProcessing}
                  className="px-3.5 py-1.5 rounded-xl bg-surface hover:bg-surface-hover text-gray-200 border border-border text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                  title="Criar backup imediatamente agora"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${isProcessing ? 'animate-spin' : ''}`} />
                  <span>Gerar Backup Agora</span>
                </button>
              </div>

              {/* Botões de Ação Principais Solicitados pelo Usuário */}
              <div className="pt-3 border-t border-border/60 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. Exportar Base SQLite */}
                <button
                  onClick={() => handleExport('sqlite')}
                  className="p-3 rounded-xl bg-[#1A1A22] hover:bg-[#20202A] border border-border text-left transition-all group flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between text-indigo-400 mb-1.5">
                    <Archive className="w-4 h-4" />
                    <Download className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-white">Exportar SQLite</div>
                    <div className="text-[11px] text-gray-400">Arquivo compactado (.db.gz)</div>
                  </div>
                </button>

                {/* 2. Exportar Base JSON */}
                <button
                  onClick={() => handleExport('json')}
                  className="p-3 rounded-xl bg-[#1A1A22] hover:bg-[#20202A] border border-border text-left transition-all group flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between text-cyan-400 mb-1.5">
                    <FileCode className="w-4 h-4" />
                    <Download className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-white">Exportar JSON</div>
                    <div className="text-[11px] text-gray-400">Base completa estruturada</div>
                  </div>
                </button>

                {/* 3. Restaurar Backup */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/30 text-left transition-all group flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between text-amber-400 mb-1.5">
                    <Upload className="w-4 h-4" />
                    <Shield className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-amber-200">Restaurar Backup</div>
                    <div className="text-[11px] text-amber-300/80">Upload (.db, .gz ou .json)</div>
                  </div>
                </button>

                {/* Input oculto de arquivo */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".db,.gz,.json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* Card Explicativo da Trava de Segurança */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-[#121820] to-[#141419] border border-emerald-500/30 space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                  <Shield className="w-4 h-4" />
                  Trava de Segurança Ativa
                </div>
                <h4 className="font-bold text-white text-sm">
                  Proteção Zero Perda de Dados
                </h4>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Antes de qualquer restauração ser aplicada, o sistema <strong>gera automaticamente uma cópia de segurança</strong> do estado atual (<code className="text-emerald-300 font-mono">backup_pre_restore_...</code>).
                </p>
              </div>

              <div className="text-[11px] text-emerald-400/90 bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20 flex items-center gap-2">
                <Check className="w-3.5 h-3.5 shrink-0" />
                <span>Reversão garantida caso você restaure um ponto incorreto.</span>
              </div>
            </div>
          </div>

          {/* Histórico dos Últimos 30 Dias */}
          <div className="p-5 rounded-2xl bg-[#141419] border border-border space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  Histórico de Backups Disponíveis (Últimos 30 Dias)
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Pontos de restauração salvos localmente no seu computador.
                </p>
              </div>

              <button
                onClick={loadBackups}
                disabled={isLoadingBackups}
                className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingBackups ? 'animate-spin' : ''}`} />
                Atualizar lista
              </button>
            </div>

            {backups.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400 border border-dashed border-border rounded-xl">
                Nenhum backup encontrado ainda na pasta. Clique em "Gerar Backup Agora" para criar o primeiro ponto.
              </div>
            ) : (
              <div className="divide-y divide-border/60 border border-border/80 rounded-xl overflow-hidden bg-[#101014]">
                {backups.map((b) => {
                  const isPreRestore = b.type === 'pre_restore';
                  const isDaily = b.type === 'daily';

                  return (
                    <div
                      key={b.filename}
                      className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`p-2 rounded-lg shrink-0 ${
                            isPreRestore
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : isDaily
                              ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {isPreRestore ? (
                            <Shield className="w-4 h-4" />
                          ) : isDaily ? (
                            <Calendar className="w-4 h-4" />
                          ) : (
                            <Archive className="w-4 h-4" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs text-white font-semibold truncate">
                              {b.filename}
                            </span>
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                                isPreRestore
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : isDaily
                                  ? 'bg-indigo-500/20 text-indigo-300'
                                  : 'bg-amber-500/20 text-amber-300'
                              }`}
                            >
                              {isPreRestore ? 'Trava Preventiva' : isDaily ? 'Diário' : 'Manual'}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-gray-400 mt-0.5">
                            <span>
                              {new Date(b.createdAt).toLocaleString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            <span>•</span>
                            <span className="font-mono text-gray-300">{b.sizeFormatted}</span>
                          </div>
                        </div>
                      </div>

                      {/* Ações por item do histórico */}
                      <div className="flex items-center gap-2 shrink-0">
                        {confirmRestoreFile === b.filename ? (
                          <div className="flex items-center gap-1.5 bg-amber-950/40 p-1 rounded-lg border border-amber-500/40">
                            <span className="text-[10px] text-amber-300 font-semibold px-1">
                              Confirmar?
                            </span>
                            <button
                              onClick={() => handleRestoreFromHistory(b.filename)}
                              disabled={isProcessing}
                              className="px-2 py-1 bg-amber-500 hover:bg-amber-400 text-black rounded text-[11px] font-bold transition-colors"
                            >
                              Sim, Restaurar
                            </button>
                            <button
                              onClick={() => setConfirmRestoreFile(null)}
                              className="px-1.5 py-1 text-gray-400 hover:text-white text-[11px]"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmRestoreFile(b.filename)}
                            className="px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-hover text-amber-300 border border-border text-xs font-medium transition-all"
                          >
                            Restaurar este ponto
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {activeSubTab === 'supabase' && (
        <div className="p-5 rounded-2xl bg-[#141419] border border-border space-y-5">
          <div>
            <h3 className="font-bold text-white text-base">Sincronização em Nuvem com Supabase (Opcional)</h3>
            <p className="text-xs text-gray-400 mt-1">
              Conecte sua conta do Supabase para espelhar dados na nuvem enquanto mantém o banco SQLite local seguro.
            </p>
          </div>

          <form onSubmit={handleSaveSupabase} className="space-y-4 max-w-xl">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Project URL do Supabase:
              </label>
              <input
                type="text"
                placeholder="https://seu-projeto.supabase.co"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-950 border border-border rounded-xl text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Anon Public Key:
              </label>
              <input
                type="password"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={supabaseKey}
                onChange={(e) => setSupabaseKey(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-950 border border-border rounded-xl text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {supabaseFeedback && (
              <p className="text-xs text-emerald-400 font-medium">{supabaseFeedback}</p>
            )}

            <button
              type="submit"
              disabled={isTestingSupabase}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <Database className="w-3.5 h-3.5" />
              <span>{isTestingSupabase ? 'Testando Conexão...' : 'Salvar & Conectar Supabase'}</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
