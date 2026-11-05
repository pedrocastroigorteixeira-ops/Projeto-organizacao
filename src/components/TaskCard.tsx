'use client';

import React, { useState } from 'react';
import { Area, Item } from '../types';
import { EFFORT_LABELS } from '../lib/constants';
import {
  Check,
  Calendar,
  Clock,
  Zap,
  Inbox,
  AlertCircle,
  MoreVertical,
  Repeat,
  FileText,
  Trash2,
  Edit2,
  CalendarPlus,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface TaskCardProps {
  item: Item;
  area: Area | null;
  onToggleStatus: (id: string, currentStatus: string) => Promise<void>;
  onPostpone: (id: string, days: number) => Promise<void>;
  onMoveToInbox: (id: string) => Promise<void>;
  onEdit: (item: Item) => void;
  onDelete: (id: string) => Promise<void>;
  isSelected?: boolean;
}

export function TaskCard({
  item,
  area,
  onToggleStatus,
  onPostpone,
  onMoveToInbox,
  onEdit,
  onDelete,
  isSelected = false,
}: TaskCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showMobileActions, setShowMobileActions] = useState(false);

  const isCompleted = item.status === 'completed';
  const effortConfig = item.effort ? EFFORT_LABELS[item.effort] : null;

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isCompleted) {
      // Dispara confete sutil para gratificação visual imediata
      try {
        confetti({
          particleCount: 30,
          spread: 60,
          origin: { y: 0.8 },
          colors: area ? [area.color, '#F59E0B', '#10B981'] : ['#10B981', '#60A5FA'],
          disableForReducedMotion: true,
        });
      } catch {
        // Fallback silencioso
      }
    }
    onToggleStatus(item.id, item.status);
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group relative rounded-xl border p-3.5 transition-all duration-150 ${
        isSelected
          ? 'ring-2 ring-amber-500/60 border-amber-500/40 bg-[#1D1D27]'
          : isCompleted
          ? 'border-border/50 bg-[#111116] opacity-60'
          : 'border-border bg-card hover:bg-card-hover hover:border-border-focus shadow-sm'
      }`}
      style={{
        borderLeftWidth: area ? '4px' : '1px',
        borderLeftColor: area ? area.color : undefined,
      }}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox Circular */}
        <button
          type="button"
          onClick={handleCheckboxClick}
          aria-label={isCompleted ? 'Desmarcar tarefa' : 'Concluir tarefa'}
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all ${
            isCompleted
              ? 'border-emerald-500 bg-emerald-500 text-black shadow-sm'
              : 'border-gray-500/60 hover:border-emerald-400 hover:bg-emerald-500/10'
          }`}
        >
          {isCompleted && <Check className="h-3.5 w-3.5 stroke-[3]" />}
        </button>

        {/* Conteúdo Principal */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Tag da Frente */}
            {area && (
              <span
                className="text-[11px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded"
                style={{
                  backgroundColor: `${area.color}18`,
                  color: area.color,
                }}
              >
                {area.name}
              </span>
            )}

            {/* Prioridade Alta */}
            {item.priority === 'high' && !isCompleted && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-red-400 bg-red-500/15 px-1.5 py-0.5 rounded border border-red-500/30">
                <AlertCircle className="h-3 w-3" />
                Urgente
              </span>
            )}

            {/* Esforço com Ícone e Palavra */}
            {effortConfig && !isCompleted && (
              <span
                className={`flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded border ${effortConfig.badgeClass}`}
                title={`Esforço: ${effortConfig.name}`}
              >
                <Zap className="h-3 w-3" />
                <span>{effortConfig.name} ({effortConfig.label})</span>
              </span>
            )}

            {/* Horário */}
            {item.scheduled_time && !isCompleted && (
              <span className="flex items-center gap-1 text-[11px] font-medium text-indigo-300 bg-indigo-500/15 px-2 py-0.5 rounded border border-indigo-500/30">
                <Clock className="h-3 w-3" />
                {item.scheduled_time}
              </span>
            )}

            {/* Recorrência */}
            {item.recurrence && !isCompleted && (
              <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded border border-emerald-500/30">
                <Repeat className="h-3 w-3" />
                {item.recurrence}
              </span>
            )}

            {/* Tipo Nota */}
            {item.type === 'note' && (
              <span className="flex items-center gap-1 text-[11px] font-medium text-purple-300 bg-purple-500/15 px-2 py-0.5 rounded border border-purple-500/30">
                <FileText className="h-3 w-3" />
                Ideia / Nota
              </span>
            )}
          </div>

          {/* Título da Tarefa */}
          <p
            className={`mt-1.5 text-sm sm:text-base leading-snug font-medium text-gray-100 ${
              isCompleted ? 'line-through text-gray-500' : ''
            }`}
          >
            {item.title}
          </p>
        </div>

        {/* Botão de Menu para Mobile */}
        <div className="sm:hidden flex items-center">
          <button
            onClick={() => setShowMobileActions(!showMobileActions)}
            className="p-1 text-gray-400 hover:text-gray-200"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* AÇÕES RÁPIDAS NO HOVER (Desktop) & TOGGLE NO MOBILE */}
      {/* "No hover/toque de cada tarefa: +1 dia, +1 semana, voltar pro Inbox, sem janela de confirmação." */}
      <div
        className={`mt-3 pt-2 border-t border-border/60 flex items-center justify-between flex-wrap gap-1.5 transition-all ${
          isHovered || showMobileActions ? 'opacity-100' : 'sm:opacity-0 sm:pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* +1 Dia */}
          <button
            onClick={() => onPostpone(item.id, 1)}
            title="Adiar para amanhã (+1 dia)"
            className="flex items-center gap-1 rounded-md bg-surface px-2 py-1 text-xs text-gray-300 hover:bg-surface-hover hover:text-white border border-border transition-colors active:scale-95"
          >
            <CalendarPlus className="h-3.5 w-3.5 text-amber-400" />
            <span>+1 dia</span>
          </button>

          {/* +1 Semana */}
          <button
            onClick={() => onPostpone(item.id, 7)}
            title="Adiar para daqui a 1 semana (+7 dias)"
            className="flex items-center gap-1 rounded-md bg-surface px-2 py-1 text-xs text-gray-300 hover:bg-surface-hover hover:text-white border border-border transition-colors active:scale-95"
          >
            <Calendar className="h-3.5 w-3.5 text-cyan-400" />
            <span>+1 sem</span>
          </button>

          {/* Voltar pro Inbox */}
          <button
            onClick={() => onMoveToInbox(item.id)}
            title="Remover data e voltar para o Inbox para triar depois"
            className="flex items-center gap-1 rounded-md bg-surface px-2 py-1 text-xs text-gray-300 hover:bg-surface-hover hover:text-white border border-border transition-colors active:scale-95"
          >
            <Inbox className="h-3.5 w-3.5 text-purple-400" />
            <span>Inbox</span>
          </button>
        </div>

        {/* Editar e Excluir */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(item)}
            title="Editar detalhes"
            className="rounded-md p-1.5 text-gray-400 hover:bg-surface hover:text-gray-200 transition-colors"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={() => onDelete(item.id)}
            title="Excluir tarefa"
            className="rounded-md p-1.5 text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
