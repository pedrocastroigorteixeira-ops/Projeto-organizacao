'use client';

import React, { useState } from 'react';
import { Area, Item } from '../types';
import { EFFORT_LABELS } from '../lib/constants';
import { formatDate } from '../lib/parser';
import { formatRecurrenceLabel, checkRecurrenceDueStatus } from '../lib/recurrence';
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
  SunMedium,
  BellRing,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface TaskCardProps {
  item: Item;
  area: Area | null;
  onToggleStatus: (id: string, currentStatus: string) => Promise<void>;
  onPostpone: (id: string, days: number) => Promise<void>;
  onPostponeToWeekend?: (id: string) => Promise<void>;
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
  onPostponeToWeekend,
  onMoveToInbox,
  onEdit,
  onDelete,
  isSelected = false,
}: TaskCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showMobileActions, setShowMobileActions] = useState(false);

  const isCompleted = item.status === 'completed';
  const effortConfig = item.effort ? EFFORT_LABELS[item.effort] : null;

  const todayStr = formatDate(new Date());
  const dueStatus = checkRecurrenceDueStatus(item, todayStr);
  const recurrenceLabel = formatRecurrenceLabel(item.recurrence);
  const isRecurring = Boolean(item.recurrence || item.is_recurring);

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isCompleted) {
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
      tabIndex={0}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group relative rounded-xl border p-3.5 transition-all duration-150 outline-none ${
        isSelected
          ? 'ring-1 ring-amber-500/40 border-amber-500/40 bg-[#16161D]'
          : isCompleted
          ? 'border-border/40 bg-[#111115] opacity-60'
          : 'border-border/80 bg-card hover:bg-card-hover hover:border-neutral-700 focus-visible:border-amber-500/50 focus-visible:ring-1 focus-visible:ring-amber-500/30 shadow-sm'
      }`}
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
              : 'border-neutral-600 hover:border-emerald-400 hover:bg-emerald-500/10'
          }`}
        >
          {isCompleted && <Check className="h-3.5 w-3.5 stroke-[3]" />}
        </button>

        {/* Conteúdo Principal */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Tag da Frente / Negócio */}
            {area && (
              <span
                className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-md border"
                style={{
                  backgroundColor: `${area.color}14`,
                  color: area.color === '#EF4444' ? '#F87171' : area.color,
                  borderColor: `${area.color}30`,
                }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: area.color }} />
                <span>{area.name}</span>
              </span>
            )}

            {/* Horário Marcado */}
            {item.scheduled_time && !isCompleted && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-neutral-300 bg-surface px-2 py-0.5 rounded-md border border-neutral-700/80">
                <Clock className="h-3 w-3 text-neutral-400" />
                <span>{item.scheduled_time}</span>
              </span>
            )}

            {/* Prioridade Alta */}
            {item.priority === 'high' && !isCompleted && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-300 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/30">
                <AlertCircle className="h-3 w-3 text-rose-400" />
                <span>Prioritária</span>
              </span>
            )}

            {/* Esforço */}
            {effortConfig && !isCompleted && (
              <span
                className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md border ${effortConfig.badgeClass}`}
                title={`Esforço: ${effortConfig.name}`}
              >
                <Zap className="h-3 w-3" />
                <span>{effortConfig.name} ({effortConfig.label})</span>
              </span>
            )}

            {/* Lembrete antecipado */}
            {dueStatus.isWarning && !isCompleted && (
              <span
                className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-md border border-amber-500/30"
                title={`Vence em ${dueStatus.daysRemaining} dias`}
              >
                <BellRing className="h-3 w-3 text-amber-400" />
                <span>{dueStatus.label}</span>
              </span>
            )}

            {/* Destaque recorrente */}
            {isRecurring && !isCompleted && (
              <span
                className="inline-flex items-center gap-1 text-xs font-medium text-neutral-300 bg-surface px-2 py-0.5 rounded-md border border-neutral-700/80"
                title={`Ritual operacional / Tarefa recorrente: ${recurrenceLabel || item.recurrence}`}
              >
                <Repeat className="h-3 w-3 text-amber-400/80" />
                <span>{recurrenceLabel || item.recurrence}</span>
                {item.advance_warning_days && (
                  <span className="text-neutral-400 font-normal ml-0.5">
                    (avisa {item.advance_warning_days}d antes)
                  </span>
                )}
              </span>
            )}

            {/* Tipo Nota */}
            {item.type === 'note' && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/25">
                <FileText className="h-3 w-3" />
                <span>Nota</span>
              </span>
            )}
          </div>

          {/* Título da Tarefa */}
          <p
            className={`mt-1.5 text-sm sm:text-base leading-snug font-medium text-neutral-100 ${
              isCompleted ? 'line-through text-neutral-500' : ''
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

      {/* AÇÕES RÁPIDAS NO HOVER OU FOCO VIA TECLADO */}
      {/* "Em cada item, ao passar o mouse ou focar via teclado: atalhos de 1 clique (+1 dia, +fim de semana, 'voltar pro Inbox')" */}
      <div
        className={`mt-3 pt-2 border-t border-border/60 flex items-center justify-between flex-wrap gap-1.5 transition-all ${
          isHovered || showMobileActions
            ? 'opacity-100 pointer-events-auto'
            : 'sm:opacity-0 sm:pointer-events-none group-focus-within:opacity-100 group-focus-within:pointer-events-auto'
        }`}
      >
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* +1 Dia */}
          <button
            onClick={() => onPostpone(item.id, 1)}
            title="Adiar para amanhã (+1 dia)"
            className="flex items-center gap-1 rounded-lg bg-surface px-2.5 py-1 text-xs text-gray-300 hover:bg-surface-hover hover:text-white border border-border transition-colors active:scale-95 focus:ring-1 focus:ring-amber-400"
          >
            <CalendarPlus className="h-3.5 w-3.5 text-amber-400" />
            <span>+1 dia</span>
          </button>

          {/* +Fim de semana */}
          <button
            onClick={() => {
              if (onPostponeToWeekend) {
                onPostponeToWeekend(item.id);
              } else {
                onPostpone(item.id, 2);
              }
            }}
            title="Adiar para o próximo fim de semana"
            className="flex items-center gap-1 rounded-lg bg-surface px-2.5 py-1 text-xs text-gray-300 hover:bg-surface-hover hover:text-white border border-border transition-colors active:scale-95 focus:ring-1 focus:ring-cyan-400"
          >
            <SunMedium className="h-3.5 w-3.5 text-cyan-400" />
            <span>+fim de semana</span>
          </button>

          {/* Voltar pro Inbox */}
          <button
            onClick={() => onMoveToInbox(item.id)}
            title="Remover data e voltar para o Inbox para triar depois"
            className="flex items-center gap-1 rounded-lg bg-surface px-2.5 py-1 text-xs text-gray-300 hover:bg-surface-hover hover:text-white border border-border transition-colors active:scale-95 focus:ring-1 focus:ring-purple-400"
          >
            <Inbox className="h-3.5 w-3.5 text-purple-400" />
            <span>voltar pro Inbox</span>
          </button>
        </div>

        {/* Editar e Excluir */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(item)}
            title="Editar detalhes"
            className="rounded-lg p-1.5 text-gray-400 hover:bg-surface hover:text-gray-200 transition-colors"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={() => onDelete(item.id)}
            title="Excluir tarefa"
            className="rounded-lg p-1.5 text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
