'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Area, Item, ParsedCapture } from '../types';
import { parseQuickCapture } from '../lib/parser';
import { checkScheduleConflict } from '../lib/conflicts';
import {
  Calendar,
  Clock,
  Zap,
  AlertCircle,
  AlertTriangle,
  Sparkles,
  Inbox,
  X,
  CornerDownLeft,
  Tag,
  Repeat,
  FileText,
} from 'lucide-react';

interface QuickCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (capture: ParsedCapture) => Promise<void>;
  areas: Area[];
  items?: Item[];
  initialInput?: string;
}

export function QuickCaptureModal({
  isOpen,
  onClose,
  onSave,
  areas,
  items = [],
  initialInput,
}: QuickCaptureModalProps) {
  const [input, setInput] = useState('');
  const [parsed, setParsed] = useState<ParsedCapture>(() =>
    parseQuickCapture(initialInput || '', areas)
  );
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Detecção inteligente de choque de horário
  const conflict =
    parsed.scheduledDate && parsed.scheduledTime && items.length > 0
      ? checkScheduleConflict(
          parsed.scheduledDate,
          parsed.scheduledTime,
          parsed.effort === 'quick' ? 30 : parsed.effort === 'long' ? 120 : 60,
          null,
          items,
          areas
        )
      : { hasConflict: false };

  useEffect(() => {
    if (isOpen) {
      const startText = initialInput || '';
      setInput(startText);
      setParsed(parseQuickCapture(startText, areas));
      setTimeout(() => {
        inputRef.current?.focus();
        if (startText && inputRef.current) {
          inputRef.current.setSelectionRange(startText.length, startText.length);
        }
      }, 50);
    }
  }, [isOpen, areas, initialInput]);

  useEffect(() => {
    setParsed(parseQuickCapture(input, areas));
  }, [input, areas]);

  // Listener para Esc e Enter
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isSaving) return;

    try {
      setIsSaving(true);
      await onSave(parsed);
      setInput('');
      onClose();
    } catch (err) {
      console.error('Erro ao salvar captura:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const insertToken = (token: string) => {
    setInput((prev) => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed} ${token} ` : `${token} `;
    });
    inputRef.current?.focus();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 pt-16 sm:pt-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Caixa do Modal */}
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-[#141419] shadow-2xl transition-all">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-border/80 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Zap className="h-4 w-4" />
            </div>
            <h2 className="text-sm font-semibold text-white">
              Captura Rápida
            </h2>
            <span className="text-xs text-gray-400 hidden sm:inline">
              (tire da cabeça em 2 segundos)
            </span>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-white/5 hover:text-gray-200 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Formulário de Input */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ex: pagar fornecedor #bendito sex :rapida ou comprar peça do forno"
              className="w-full rounded-xl bg-card border border-border px-4 py-3.5 text-base sm:text-lg text-white placeholder-gray-500 focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
            />
            {input && (
              <button
                type="button"
                onClick={() => setInput('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* ETIQUETAS DO QUE O SISTEMA ENTENDEU (Em tempo real) */}
          <div className="min-h-[50px] rounded-xl bg-background/60 p-3 border border-border/70 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-amber-400" />
                O que o sistema entendeu:
              </span>

              {/* Destino final */}
              <div className="text-xs font-medium">
                {parsed.isInbox ? (
                  <span className="flex items-center gap-1 text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                    <Inbox className="h-3 w-3" />
                    Vai para o Inbox
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    <Calendar className="h-3 w-3" />
                    {parsed.scheduledDate === new Date().toISOString().split('T')[0]
                      ? 'Vai para Hoje'
                      : `Agendado (${parsed.dateLabel})`}
                  </span>
                )}
              </div>
            </div>

            {/* Tags detectadas */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {/* Frente / Empresa */}
              {parsed.area ? (
                <span
                  className="flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold shadow-sm"
                  style={{
                    backgroundColor: `${parsed.area.color}20`,
                    color: parsed.area.color,
                    borderColor: `${parsed.area.color}40`,
                    borderWidth: '1px',
                  }}
                >
                  <Tag className="h-3 w-3" />
                  {parsed.area.name}
                </span>
              ) : parsed.unrecognizedArea ? (
                <span className="flex items-center gap-1 rounded-md bg-red-500/20 text-red-300 px-2.5 py-1 text-xs font-medium border border-red-500/40">
                  <AlertCircle className="h-3 w-3 text-red-400" />
                  Frente desconhecida: {parsed.unrecognizedArea}
                </span>
              ) : (
                <span className="text-xs text-gray-400 italic">
                  Sem frente (irá para triagem)
                </span>
              )}

              {/* Data */}
              {parsed.scheduledDate && (
                <span className="flex items-center gap-1 rounded-md bg-blue-500/15 text-blue-300 px-2.5 py-1 text-xs font-medium border border-blue-500/30">
                  <Calendar className="h-3 w-3" />
                  {parsed.dateLabel}
                </span>
              )}

              {/* Horário */}
              {parsed.scheduledTime && (
                <span className="flex items-center gap-1 rounded-md bg-indigo-500/15 text-indigo-300 px-2 py-1 text-xs font-medium border border-indigo-500/30">
                  <Clock className="h-3 w-3" />
                  {parsed.scheduledTime}
                </span>
              )}

              {/* Prioridade Alta */}
              {parsed.priority === 'high' && (
                <span className="flex items-center gap-1 rounded-md bg-red-500/20 text-red-300 px-2 py-1 text-xs font-bold border border-red-500/40 animate-pulse">
                  <AlertCircle className="h-3 w-3" />
                  Urgente (!!)
                </span>
              )}

              {/* Esforço */}
              {parsed.effort && (
                <span className="flex items-center gap-1 rounded-md bg-amber-500/15 text-amber-300 px-2 py-1 text-xs font-medium border border-amber-500/30">
                  <Zap className="h-3 w-3" />
                  {parsed.effortLabel}
                </span>
              )}

              {/* Recorrência */}
              {parsed.recurrence && (
                <span className="flex items-center gap-1 rounded-md bg-emerald-500/15 text-emerald-300 px-2 py-1 text-xs font-medium border border-emerald-500/30">
                  <Repeat className="h-3 w-3" />
                  {parsed.recurrence}
                </span>
              )}

              {/* Tipo Nota/Ideia */}
              {parsed.type === 'note' && (
                <span className="flex items-center gap-1 rounded-md bg-purple-500/15 text-purple-300 px-2 py-1 text-xs font-medium border border-purple-500/30">
                  <FileText className="h-3 w-3" />
                  Ideia / Nota
                </span>
              )}
            </div>

            {/* Preview do título limpo */}
            {parsed.cleanTitle && (
              <div className="pt-1 text-xs text-gray-300">
                <span className="text-gray-400">Título: </span>
                <span className="font-medium text-white">"{parsed.cleanTitle}"</span>
              </div>
            )}
          </div>

          {/* AVISO DE BLOQUEIO INTELIGENTE: CHOQUE DE HORÁRIO */}
          {conflict.hasConflict && (
            <div className="rounded-xl bg-amber-950/40 border border-amber-500/50 p-3 text-xs text-amber-200 flex items-start gap-2.5 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1 w-full">
                <div className="font-semibold text-amber-300 flex items-center justify-between">
                  <span>⚠️ Choque de horário detectado!</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">
                    {conflict.conflictingInterval}
                  </span>
                </div>
                <p className="text-neutral-300">
                  Você já tem o compromisso <strong className="text-white">"{conflict.conflictingItem?.title}"</strong> agendado para este mesmo horário em <em>{conflict.conflictingAreaName}</em>.
                </p>
                {conflict.suggestedSlot && (
                  <div className="pt-1 flex items-center gap-2">
                    <span className="text-neutral-400 text-[11px]">Sugestão livre:</span>
                    <button
                      type="button"
                      onClick={() => {
                        const replaced = input.replace(/\b(\d{1,2}h(\d{2})?|\d{1,2}:\d{2})\b/gi, conflict.suggestedSlot!);
                        setInput(replaced.includes(conflict.suggestedSlot!) ? replaced : `${input} ${conflict.suggestedSlot}`);
                      }}
                      className="px-2.5 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 font-mono text-xs flex items-center gap-1 transition-colors"
                    >
                      <Clock className="w-3 h-3" />
                      Ajustar para às {conflict.suggestedSlot}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Atalhos rápidos clicáveis para o celular ou mouse */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-medium text-gray-400">
              Toque rápido para adicionar:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {areas.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => insertToken(`#${a.slug}`)}
                  className="rounded-lg px-2 py-1 text-xs transition-colors border"
                  style={{
                    backgroundColor: `${a.color}15`,
                    color: a.color,
                    borderColor: `${a.color}35`,
                  }}
                >
                  #{a.slug}
                </button>
              ))}
              <button
                type="button"
                onClick={() => insertToken('hoje')}
                className="rounded-lg bg-surface px-2 py-1 text-xs text-gray-300 border border-border hover:bg-surface-hover"
              >
                hoje
              </button>
              <button
                type="button"
                onClick={() => insertToken('amanhã')}
                className="rounded-lg bg-surface px-2 py-1 text-xs text-gray-300 border border-border hover:bg-surface-hover"
              >
                amanhã
              </button>
              <button
                type="button"
                onClick={() => insertToken('sex')}
                className="rounded-lg bg-surface px-2 py-1 text-xs text-gray-300 border border-border hover:bg-surface-hover"
              >
                sex
              </button>
              <button
                type="button"
                onClick={() => insertToken(':rapida')}
                className="rounded-lg bg-surface px-2 py-1 text-xs text-amber-300 border border-amber-500/30 hover:bg-surface-hover"
              >
                :rapida (~5m)
              </button>
              <button
                type="button"
                onClick={() => insertToken('!!')}
                className="rounded-lg bg-red-500/10 px-2 py-1 text-xs text-red-400 border border-red-500/30 hover:bg-red-500/20 font-bold"
              >
                !! urgente
              </button>
              <button
                type="button"
                onClick={() => insertToken(':ideia')}
                className="rounded-lg bg-purple-500/10 px-2 py-1 text-xs text-purple-400 border border-purple-500/30 hover:bg-purple-500/20"
              >
                :ideia
              </button>
            </div>
          </div>

          {/* Rodapé com botão de salvar */}
          <div className="flex items-center justify-between border-t border-border/80 pt-4">
            <div className="hidden sm:flex items-center gap-2 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <kbd className="rounded bg-card px-1.5 py-0.5 text-[10px] text-gray-300 border border-border">
                  Enter
                </kbd>{' '}
                salva
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <kbd className="rounded bg-card px-1.5 py-0.5 text-[10px] text-gray-300 border border-border">
                  Esc
                </kbd>{' '}
                fecha
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-initial rounded-xl px-4 py-2 text-xs font-medium text-gray-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!input.trim() || isSaving}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-2.5 text-xs font-semibold text-black shadow-md hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all"
              >
                <span>{isSaving ? 'Salvando...' : 'Salvar'}</span>
                <CornerDownLeft className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
