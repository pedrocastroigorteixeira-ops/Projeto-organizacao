'use client';

import React, { useState, useEffect } from 'react';
import { Area, Item, ItemType, EffortType, PriorityType } from '../types';
import { formatDate } from '../lib/parser';
import {
  X,
  Calendar,
  Tag,
  FileText,
  CheckCircle2,
  CornerDownLeft,
  Sparkles,
  Zap,
} from 'lucide-react';

interface QuickContextModalProps {
  isOpen: boolean;
  item: Item | null;
  areas: Area[];
  onClose: () => void;
  onSave: (id: string, updates: Partial<Item>) => Promise<void>;
}

export function QuickContextModal({
  isOpen,
  item,
  areas,
  onClose,
  onSave,
}: QuickContextModalProps) {
  const [title, setTitle] = useState('');
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [scheduledDate, setScheduledDate] = useState<string | null>(null);
  const [itemType, setItemType] = useState<ItemType>('task');
  const [isSaving, setIsSaving] = useState(false);

  const todayStr = formatDate(new Date());

  const tomorrowStr = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return formatDate(d);
  })();

  const nextWeekStr = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return formatDate(d);
  })();

  useEffect(() => {
    if (item && isOpen) {
      setTitle(item.title);
      setSelectedAreaId(item.area_id);
      setScheduledDate(item.scheduled_date);
      setItemType(item.type);
    }
  }, [item, isOpen]);

  // Triagem 100% pelo teclado dentro do modal:
  // 1, 2, 3, 4 -> seleciona a frente
  // H -> Fazer Hoje
  // A -> Amanhã
  // S -> Próxima Semana
  // N -> Nota/Ideia
  // T -> Tarefa
  // Enter -> Salvar
  // Esc -> Fechar
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      // Se estiver editando o input de texto do título, não intercepta letras simples
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' && target.getAttribute('type') === 'text';

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      // Enter salva quando não estiver com Shift
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSave();
        return;
      }

      if (isInput) return;

      // Atalhos numéricos 1-4 para as frentes
      if (e.key === '1' && areas[0]) {
        e.preventDefault();
        setSelectedAreaId((prev) => (prev === areas[0].id ? null : areas[0].id));
      } else if (e.key === '2' && areas[1]) {
        e.preventDefault();
        setSelectedAreaId((prev) => (prev === areas[1].id ? null : areas[1].id));
      } else if (e.key === '3' && areas[2]) {
        e.preventDefault();
        setSelectedAreaId((prev) => (prev === areas[2].id ? null : areas[2].id));
      } else if (e.key === '4' && areas[3]) {
        e.preventDefault();
        setSelectedAreaId((prev) => (prev === areas[3].id ? null : areas[3].id));
      }

      // Atalhos de Data: H (Hoje), A (Amanhã), S (Semana)
      if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        setScheduledDate(todayStr);
      } else if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        setScheduledDate(tomorrowStr);
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        setScheduledDate(nextWeekStr);
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        setScheduledDate(null);
      }

      // Atalho para tipo: N (Nota), T (Tarefa)
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setItemType('note');
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        setItemType('task');
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, areas, todayStr, tomorrowStr, nextWeekStr, onClose, title, selectedAreaId, scheduledDate, itemType]);

  const handleSave = async () => {
    if (!item || !title.trim() || isSaving) return;

    try {
      setIsSaving(true);
      await onSave(item.id, {
        title: title.trim(),
        area_id: selectedAreaId,
        scheduled_date: scheduledDate,
        type: itemType,
      });
      onClose();
    } catch (err) {
      console.error('Erro ao salvar contextualização:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Caixa do Modal */}
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-[#141419] shadow-2xl">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-border/80 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">
                Contextualização Rápida
              </h2>
              <span className="text-[11px] text-gray-400">
                100% pelo teclado: defina negócio, prazo ou transforme em nota
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-white/5 hover:text-gray-200 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-4">
          {/* Título */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Título do Item:
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl bg-card border border-border px-3.5 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          {/* 1. SELECIONAR NEGÓCIO / FRENTE (Teclas 1, 2, 3, 4) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-amber-400" />
                Negócio / Frente:
              </span>
              <span className="text-[10px] text-gray-500 hidden sm:inline">
                Pressione as teclas <kbd className="px-1 py-0.5 bg-card rounded border border-border">1</kbd> a <kbd className="px-1 py-0.5 bg-card rounded border border-border">4</kbd>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {areas.map((a, idx) => {
                const isSelected = selectedAreaId === a.id;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() =>
                      setSelectedAreaId((prev) => (prev === a.id ? null : a.id))
                    }
                    className={`flex items-center gap-2.5 rounded-xl p-2.5 text-xs font-semibold border transition-all text-left ${
                      isSelected
                        ? 'border-white/40 bg-card shadow-md scale-[1.01]'
                        : 'border-border bg-surface/70 text-gray-400 hover:text-gray-200 hover:bg-surface'
                    }`}
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-background text-[11px] font-mono font-bold text-gray-300 border border-border">
                      {idx + 1}
                    </span>
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: a.color }}
                    />
                    <span className="truncate flex-1" style={{ color: isSelected ? a.color : undefined }}>
                      {a.name}
                    </span>
                    {isSelected && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. DEFINIR DATA / PRAZO (Teclas H, A, S, C) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-cyan-400" />
                Quando Fazer:
              </span>
              <span className="text-[10px] text-gray-500 hidden sm:inline">
                Teclas <kbd className="px-1 py-0.5 bg-card rounded border border-border">H</kbd> Hoje • <kbd className="px-1 py-0.5 bg-card rounded border border-border">A</kbd> Amanhã
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {/* Fazer Hoje */}
              <button
                type="button"
                onClick={() => setScheduledDate(todayStr)}
                className={`flex flex-col items-center justify-center gap-1 rounded-xl py-2 px-1 text-xs font-semibold border transition-all ${
                  scheduledDate === todayStr
                    ? 'border-amber-500/50 bg-amber-500/15 text-amber-300 shadow-sm'
                    : 'border-border bg-surface/70 text-gray-400 hover:text-gray-200 hover:bg-surface'
                }`}
              >
                <span className="text-[10px] font-mono text-gray-400">[H]</span>
                <span>Fazer Hoje</span>
              </button>

              {/* Amanhã */}
              <button
                type="button"
                onClick={() => setScheduledDate(tomorrowStr)}
                className={`flex flex-col items-center justify-center gap-1 rounded-xl py-2 px-1 text-xs font-semibold border transition-all ${
                  scheduledDate === tomorrowStr
                    ? 'border-cyan-500/50 bg-cyan-500/15 text-cyan-300 shadow-sm'
                    : 'border-border bg-surface/70 text-gray-400 hover:text-gray-200 hover:bg-surface'
                }`}
              >
                <span className="text-[10px] font-mono text-gray-400">[A]</span>
                <span>Amanhã</span>
              </button>

              {/* Próxima Semana */}
              <button
                type="button"
                onClick={() => setScheduledDate(nextWeekStr)}
                className={`flex flex-col items-center justify-center gap-1 rounded-xl py-2 px-1 text-xs font-semibold border transition-all ${
                  scheduledDate === nextWeekStr
                    ? 'border-purple-500/50 bg-purple-500/15 text-purple-300 shadow-sm'
                    : 'border-border bg-surface/70 text-gray-400 hover:text-gray-200 hover:bg-surface'
                }`}
              >
                <span className="text-[10px] font-mono text-gray-400">[S]</span>
                <span>+7 Dias</span>
              </button>

              {/* Sem Data (Caixa de Entrada) */}
              <button
                type="button"
                onClick={() => setScheduledDate(null)}
                className={`flex flex-col items-center justify-center gap-1 rounded-xl py-2 px-1 text-xs font-semibold border transition-all ${
                  scheduledDate === null
                    ? 'border-gray-500/50 bg-white/10 text-gray-200 shadow-sm'
                    : 'border-border bg-surface/70 text-gray-500 hover:text-gray-300 hover:bg-surface'
                }`}
              >
                <span className="text-[10px] font-mono text-gray-400">[C]</span>
                <span>Sem Data</span>
              </button>
            </div>
          </div>

          {/* 3. TIPO: TAREFA OU NOTA/IDEIA (Teclas T, N) */}
          <div className="space-y-2 pt-1 border-t border-border/60">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-purple-400" />
                Formato do Item:
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setItemType('task')}
                className={`flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold border transition-all ${
                  itemType === 'task'
                    ? 'border-amber-500/40 bg-amber-500/15 text-amber-300'
                    : 'border-border bg-surface/70 text-gray-400 hover:text-gray-200'
                }`}
              >
                <span className="text-[10px] font-mono text-gray-400">[T]</span>
                <span>Tarefa Normal</span>
              </button>

              <button
                type="button"
                onClick={() => setItemType('note')}
                className={`flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold border transition-all ${
                  itemType === 'note'
                    ? 'border-purple-500/50 bg-purple-500/15 text-purple-300'
                    : 'border-border bg-surface/70 text-gray-400 hover:text-gray-200'
                }`}
              >
                <span className="text-[10px] font-mono text-gray-400">[N]</span>
                <span>Transformar em Nota / Ideia</span>
              </button>
            </div>
          </div>

          {/* Rodapé com atalho de Salvar */}
          <div className="flex items-center justify-between border-t border-border/80 pt-4">
            <div className="text-[11px] text-gray-400 hidden sm:flex items-center gap-2">
              <span>
                <kbd className="px-1.5 py-0.5 rounded bg-card border border-border text-gray-200">
                  Enter
                </kbd>{' '}
                salva e sai
              </span>
              <span>•</span>
              <span>
                <kbd className="px-1.5 py-0.5 rounded bg-card border border-border text-gray-200">
                  Esc
                </kbd>{' '}
                cancela
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2 text-xs font-medium text-gray-400 hover:text-white"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={!title.trim() || isSaving}
                className="flex items-center justify-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 px-5 py-2 text-xs font-medium shadow-sm transition-colors active:scale-95 disabled:opacity-40"
              >
                <span>{isSaving ? 'Salvando...' : 'Confirmar Contexto'}</span>
                <CornerDownLeft className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
