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
  Flame,
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
  onStartFocus?: (taskId: string) => void;
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
  onStartFocus,
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
          ? 'ring-2 ring-amber-500/60 border-amber-500/40 bg-[#1D1D27]'
          : isCompleted
          ? 'border-border/50 bg-[#111116] opacity-60'
          : 'border-border bg-card hover:bg-card-hover hover:border-border-focus focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 shadow-sm'
      }`}
      style={{
        borderLeftWidth: area ? '4px' : '2px',
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
            {/* Tag da Frente / Negócio */}
            {area && (
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
            )}

            {/* Horário Marcado (Destaque visual para compromissos com hora) */}
            {item.scheduled_time && !isCompleted && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded border border-indigo-500/40 shadow-sm">
                <Clock className="h-3 w-3 text-indigo-400" />
                <span>{item.scheduled_time}</span>
              </span>
            )}

            {/* Prioridade Alta (!!) */}
            {item.priority === 'high' && !isCompleted && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-red-400 bg-red-500/15 px-1.5 py-0.5 rounded border border-red-500/30 animate-pulse">
                <AlertCircle className="h-3 w-3" />
                Prioritária
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

            {/* Lembrete antecipado configurável (aviso prévio para obrigações financeiras) */}
            {dueStatus.isWarning && !isCompleted && (
              <span
                className="flex items-center gap-1.5 text-[11px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/40 shadow-sm animate-pulse"
                title={`Vence em ${dueStatus.daysRemaining} dias`}
              >
                <BellRing className="h-3 w-3 text-amber-400" />
                <span>{dueStatus.label}</span>
              </span>
            )}

            {/* Destaque visual: tarefas fixas/recorrentes ganham um ícone discreto de ciclo */}
            {isRecurring && !isCompleted && (
              <span
                className="flex items-center gap-1 text-[11px] font-medium text-cyan-300 bg-cyan-500/15 px-2 py-0.5 rounded border border-cyan-500/30"
                title={`Ritual operacional / Tarefa recorrente: ${recurrenceLabel || item.recurrence}`}
              >
                <Repeat className="h-3 w-3 text-cyan-400" />
                <span>{recurrenceLabel || item.recurrence}</span>
                {item.advance_warning_days && (
                  <span className="text-[10px] text-cyan-400/80 font-normal">
                    (avisa {item.advance_warning_days}d antes)
                  </span>
                )}
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

          {/* Entrar no Modo Foco */}
          {onStartFocus && !isCompleted && (
            <button
              onClick={() => onStartFocus(item.id)}
              title="Entrar em Hiperfoco nesta tarefa (F)"
              className="flex items-center gap-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 px-2.5 py-1 text-xs font-semibold border border-amber-500/30 transition-colors active:scale-95 focus:ring-1 focus:ring-amber-400"
            >
              <Flame className="h-3.5 w-3.5 text-amber-400" />
              <span>Foco (F)</span>
            </button>
          )}
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
