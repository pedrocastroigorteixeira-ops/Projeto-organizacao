'use client';

import React from 'react';
import { Area, Item } from '../types';
import { EFFORT_LABELS } from '../lib/constants';
import {
  Calendar,
  Check,
  FileText,
  Clock,
  Zap,
  ArrowRight,
  Sparkles,
  SlidersHorizontal,
  Archive,
} from 'lucide-react';

interface InboxItemCardProps {
  item: Item;
  area: Area | null;
  isSelected: boolean;
  onSelect: () => void;
  onMoveToToday: (id: string) => Promise<void>;
  onComplete: (id: string) => Promise<void>;
  onOpenContextModal: (item: Item) => void;
}

export function InboxItemCard({
  item,
  area,
  isSelected,
  onSelect,
  onMoveToToday,
  onComplete,
  onOpenContextModal,
}: InboxItemCardProps) {
  const effortConfig = item.effort ? EFFORT_LABELS[item.effort] : null;

  return (
    <div
      onClick={onSelect}
      className={`group relative rounded-2xl border transition-all duration-150 p-4 cursor-pointer select-none ${
        isSelected
          ? 'border-cyan-500/70 bg-[#151A24] ring-2 ring-cyan-500/30 shadow-lg shadow-cyan-950/30'
          : 'border-border bg-card hover:bg-card-hover hover:border-border-focus'
      }`}
      style={{
        borderLeftWidth: area ? '4px' : '2px',
        borderLeftColor: area ? area.color : isSelected ? '#06B6D4' : '#272733',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Conteúdo do Item */}
        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Etiquetas Superiores */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Tag de Seleção Ativa no Teclado */}
            {isSelected && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-cyan-400 bg-cyan-500/20 px-2 py-0.5 rounded-full border border-cyan-500/40">
                <span>▶ ATIVO</span>
              </span>
            )}

            {/* Negócio / Frente */}
            {area ? (
              <span
                className="text-[11px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded border"
                style={{
                  backgroundColor: `${area.color}15`,
                  color: area.color,
                  borderColor: `${area.color}35`,
                }}
              >
                {area.name}
              </span>
            ) : (
              <span className="text-[11px] font-medium text-gray-500 bg-surface px-2 py-0.5 rounded border border-border">
                Sem negócio definido
              </span>
            )}

            {/* Tipo de Item */}
            {item.type === 'note' && (
              <span className="flex items-center gap-1 text-[11px] font-medium text-purple-300 bg-purple-500/15 px-2 py-0.5 rounded border border-purple-500/30">
                <FileText className="h-3 w-3" />
                Nota / Ideia
              </span>
            )}

            {/* Esforço */}
            {effortConfig && (
              <span
                className={`flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded border ${effortConfig.badgeClass}`}
              >
                <Zap className="h-3 w-3" />
                <span>{effortConfig.name}</span>
              </span>
            )}

            {/* Horário */}
            {item.scheduled_time && (
              <span className="flex items-center gap-1 text-[11px] font-medium text-indigo-300 bg-indigo-500/15 px-2 py-0.5 rounded border border-indigo-500/30">
                <Clock className="h-3 w-3" />
                {item.scheduled_time}
              </span>
            )}

            {/* Data (se houver mas faltar negócio) */}
            {item.scheduled_date && (
              <span className="flex items-center gap-1 text-[11px] font-medium text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/30">
                <Calendar className="h-3 w-3" />
                Agendado ({item.scheduled_date})
              </span>
            )}
          </div>

          {/* Título */}
          <p
            className={`text-sm sm:text-base font-medium leading-snug transition-colors ${
              isSelected ? 'text-white' : 'text-gray-200 group-hover:text-white'
            }`}
          >
            {item.title}
          </p>
        </div>

        {/* Checkbox / Botão de Conclusão Rápida */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onComplete(item.id);
          }}
          title="Marcar como feito / arquivar (D)"
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-gray-600/60 bg-surface text-gray-400 hover:border-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300 transition-all active:scale-95"
        >
          <Check className="h-4 w-4" />
        </button>
      </div>

      {/* BARRA DE ATALHOS VISÍVEL DO ITEM */}
      <div
        className={`mt-3 pt-2.5 border-t flex items-center justify-between flex-wrap gap-2 transition-all ${
          isSelected
            ? 'border-cyan-500/30 opacity-100'
            : 'border-border/60 opacity-80 group-hover:opacity-100'
        }`}
      >
        {/* Ações com botões táteis no celular e atalhos no PC */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Fazer Hoje (Tab) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMoveToToday(item.id);
            }}
            className="flex items-center gap-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 px-2.5 py-1 text-xs font-semibold border border-amber-500/30 transition-all active:scale-95"
          >
            <span className="hidden sm:inline-block rounded bg-black/40 px-1 py-0.2 text-[10px] font-mono border border-amber-500/30">
              Tab
            </span>
            <ArrowRight className="h-3 w-3" />
            <span>Fazer Hoje</span>
          </button>

          {/* Contextualizar (Enter) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenContextModal(item);
            }}
            className="flex items-center gap-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 px-2.5 py-1 text-xs font-semibold border border-cyan-500/30 transition-all active:scale-95"
          >
            <span className="hidden sm:inline-block rounded bg-black/40 px-1 py-0.2 text-[10px] font-mono border border-cyan-500/30">
              Enter
            </span>
            <SlidersHorizontal className="h-3 w-3" />
            <span>Contextualizar</span>
          </button>

          {/* Feito / Arquivar (D) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onComplete(item.id);
            }}
            className="flex items-center gap-1.5 rounded-lg bg-surface hover:bg-emerald-500/15 text-gray-400 hover:text-emerald-300 px-2.5 py-1 text-xs font-medium border border-border hover:border-emerald-500/30 transition-all active:scale-95"
          >
            <span className="hidden sm:inline-block rounded bg-black/40 px-1 py-0.2 text-[10px] font-mono border border-border">
              D
            </span>
            <Archive className="h-3 w-3" />
            <span>Arquivar</span>
          </button>
        </div>

        {/* Dica sutil no Desktop quando selecionado */}
        {isSelected && (
          <span className="text-[11px] text-gray-400 hidden lg:inline">
            Use <kbd className="px-1 py-0.5 rounded bg-surface border border-border text-gray-300">J</kbd> / <kbd className="px-1 py-0.5 rounded bg-surface border border-border text-gray-300">K</kbd> para navegar
          </span>
        )}
      </div>
    </div>
  );
}
