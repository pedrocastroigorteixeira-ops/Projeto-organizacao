'use client';

import React, { useState, useEffect } from 'react';
import { Area, EffortType, Item, ItemType, PriorityType } from '../types';
import { EFFORT_LABELS } from '../lib/constants';
import { formatDate } from '../lib/parser';
import { checkScheduleConflict } from '../lib/conflicts';
import {
  X,
  Calendar,
  Clock,
  Zap,
  Tag,
  AlertCircle,
  AlertTriangle,
  Trash2,
  Inbox,
  Check,
  FileText,
  Repeat,
  BellRing,
} from 'lucide-react';

interface EditItemModalProps {
  isOpen: boolean;
  item: Item | null;
  areas: Area[];
  existingItems?: Item[];
  onClose: () => void;
  onSave: (id: string, updates: Partial<Item>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function EditItemModal({
  isOpen,
  item,
  areas,
  existingItems = [],
  onClose,
  onSave,
  onDelete,
}: EditItemModalProps) {
  const [title, setTitle] = useState('');
  const [areaId, setAreaId] = useState<string | null>(null);
  const [scheduledDate, setScheduledDate] = useState<string | null>(null);
  const [scheduledTime, setScheduledTime] = useState<string>('');
  const [priority, setPriority] = useState<PriorityType>('normal');
  const [effort, setEffort] = useState<EffortType | null>(null);
  const [type, setType] = useState<ItemType>('task');
  const [recurrence, setRecurrence] = useState<string>('');
  const [advanceWarningDays, setAdvanceWarningDays] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Verificação de choque de horário
  const conflict =
    scheduledDate && scheduledTime && item && existingItems.length > 0
      ? checkScheduleConflict(
          scheduledDate,
          scheduledTime,
          effort === 'quick' ? 30 : effort === 'long' ? 120 : 60,
          item.id,
          existingItems,
          areas
        )
      : { hasConflict: false };

  useEffect(() => {
    if (item && isOpen) {
      setTitle(item.title);
      setAreaId(item.area_id);
      setScheduledDate(item.scheduled_date);
      setScheduledTime(item.scheduled_time || '');
      setPriority(item.priority);
      setEffort(item.effort);
      setType(item.type);
      setRecurrence(item.recurrence || '');
      setAdvanceWarningDays(item.advance_warning_days ?? null);
    }
  }, [item, isOpen]);

  if (!isOpen || !item) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSaving) return;

    try {
      setIsSaving(true);
      await onSave(item.id, {
        title: title.trim(),
        area_id: areaId,
        scheduled_date: scheduledDate || null,
        scheduled_time: scheduledTime.trim() || null,
        priority,
        effort,
        type,
        recurrence: recurrence.trim() || null,
        advance_warning_days: advanceWarningDays,
        is_recurring: Boolean(recurrence.trim()),
      });
      onClose();
    } catch (err) {
      console.error('Erro ao atualizar item:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const setDateToday = () => setScheduledDate(formatDate(new Date()));
  const setDateTomorrow = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    setScheduledDate(formatDate(d));
  };
  const clearDate = () => setScheduledDate(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-[#141419] shadow-2xl">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-border/80 px-6 py-4">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <span>Editar Item / Triagem</span>
            {item.scheduled_date ? (
              <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                Agendado
              </span>
            ) : (
              <span className="text-xs text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20 flex items-center gap-1">
                <Inbox className="h-3 w-3" />
                No Inbox
              </span>
            )}
          </h2>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-white/5 hover:text-gray-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Título */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-300">Título:</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl bg-card border border-border px-3.5 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              required
            />
          </div>

          {/* Selecionar Frente */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-300 flex items-center gap-1">
              <Tag className="h-3.5 w-3.5 text-gray-400" />
              Frente / Empresa:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {areas.map((a) => {
                const isSelected = areaId === a.id;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setAreaId(isSelected ? null : a.id)}
                    className={`flex items-center gap-2 rounded-xl p-2 text-xs font-medium border transition-all text-left ${
                      isSelected
                        ? 'border-white/30 bg-card shadow-sm'
                        : 'border-border bg-surface text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: a.color }}
                    />
                    <span className="truncate">{a.name}</span>
                    {isSelected && <Check className="ml-auto h-3 w-3 text-white" />}
                  </button>
                );
              })}
            </div>
            {areaId && (
              <button
                type="button"
                onClick={() => setAreaId(null)}
                className="text-[11px] text-gray-500 hover:text-gray-300 underline"
              >
                Remover frente (deixar sem frente)
              </button>
            )}
          </div>

          {/* Data de Agendamento */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-300 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-gray-400" />
              Data Agendada:
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={setDateToday}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors ${
                  scheduledDate === formatDate(new Date())
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-surface text-gray-300 border-border hover:bg-surface-hover'
                }`}
              >
                Hoje
              </button>

              <button
                type="button"
                onClick={setDateTomorrow}
                className="rounded-lg bg-surface px-3 py-1.5 text-xs text-gray-300 border border-border hover:bg-surface-hover"
              >
                Amanhã
              </button>

              <button
                type="button"
                onClick={clearDate}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors flex items-center gap-1 ${
                  !scheduledDate
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    : 'bg-surface text-gray-400 border-border hover:bg-surface-hover'
                }`}
              >
                <Inbox className="h-3 w-3" />
                Sem data (Inbox)
              </button>

              <input
                type="date"
                value={scheduledDate || ''}
                onChange={(e) => setScheduledDate(e.target.value || null)}
                className="rounded-lg bg-card border border-border px-2 py-1 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Horário e Esforço */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-300 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-gray-400" />
                Horário (opcional):
              </label>
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full rounded-xl bg-card border border-border px-3 py-1.5 text-xs text-white focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-300 flex items-center gap-1">
                <Zap className="h-3.5 w-3.5 text-gray-400" />
                Esforço estimado:
              </label>
              <div className="flex gap-1.5">
                {(['quick', 'medium', 'long'] as EffortType[]).map((eff) => (
                  <button
                    key={eff}
                    type="button"
                    onClick={() => setEffort(effort === eff ? null : eff)}
                    className={`flex-1 rounded-lg py-1.5 text-xs font-medium border text-center transition-all ${
                      effort === eff
                        ? EFFORT_LABELS[eff].badgeClass
                        : 'bg-surface text-gray-400 border-border hover:text-gray-200'
                    }`}
                  >
                    {EFFORT_LABELS[eff].label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* AVISO DE CHOQUE DE HORÁRIO */}
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
                  Já existe o compromisso <strong className="text-white">"{conflict.conflictingItem?.title}"</strong> agendado neste mesmo intervalo em <em>{conflict.conflictingAreaName}</em>.
                </p>
                {conflict.suggestedSlot && (
                  <div className="pt-1 flex items-center gap-2">
                    <span className="text-neutral-400 text-[11px]">Sugestão livre:</span>
                    <button
                      type="button"
                      onClick={() => setScheduledTime(conflict.suggestedSlot!)}
                      className="px-2.5 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 font-mono text-xs flex items-center gap-1 transition-colors"
                    >
                      <Clock className="w-3 h-3" />
                      Mudar para às {conflict.suggestedSlot}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recorrência / Rituais Operacionais */}
          <div className="space-y-1.5 pt-2 border-t border-border/60">
            <label className="text-xs font-medium text-gray-300 flex items-center gap-1.5">
              <Repeat className="h-3.5 w-3.5 text-cyan-400" />
              <span>Repetição / Ritual Operacional:</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: 'Não repete', value: '' },
                { label: 'Todo dia', value: 'todo dia' },
                { label: 'Toda seg', value: 'toda seg' },
                { label: 'Todo dia 5', value: 'todo dia 5' },
                { label: 'Todo dia 20', value: 'todo dia 20' },
                { label: 'Fechamento de mês', value: 'fechamento de mês' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRecurrence(opt.value)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium border transition-colors ${
                    recurrence === opt.value
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm'
                      : 'bg-surface text-gray-400 border-border hover:text-gray-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value)}
              placeholder="Ou digite personalizado: ex: todo dia 15, toda sexta..."
              className="mt-1 w-full rounded-xl bg-card border border-border px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none"
            />
          </div>

          {/* Lembrete Antecipado para Obrigações Financeiras */}
          <div className="space-y-1.5 pt-2 border-t border-border/60">
            <label className="text-xs font-medium text-gray-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <BellRing className="h-3.5 w-3.5 text-amber-400" />
                <span>Lembrete antecipado (aviso prévio):</span>
              </span>
              <span className="text-[10px] text-gray-500">
                Evita surpresas em tributos e pró-labore
              </span>
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {[
                { label: 'Sem aviso prévio', value: null },
                { label: '1 dia antes', value: 1 },
                { label: '2 dias antes', value: 2 },
                { label: '3 dias antes', value: 3 },
                { label: '5 dias antes', value: 5 },
              ].map((opt) => (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => setAdvanceWarningDays(opt.value)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium border transition-colors ${
                    advanceWarningDays === opt.value
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                      : 'bg-surface text-gray-400 border-border hover:text-gray-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Prioridade e Tipo */}
          <div className="flex items-center justify-between pt-2 border-t border-border/60">
            <button
              type="button"
              onClick={() => setPriority(priority === 'high' ? 'normal' : 'high')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors ${
                priority === 'high'
                  ? 'bg-red-500/20 text-red-300 border-red-500/40'
                  : 'bg-surface text-gray-400 border-border hover:text-gray-200'
              }`}
            >
              <AlertCircle className="h-3.5 w-3.5" />
              <span>{priority === 'high' ? 'Urgente (!!)' : 'Prioridade Normal'}</span>
            </button>

            <button
              type="button"
              onClick={() => setType(type === 'task' ? 'note' : 'task')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors ${
                type === 'note'
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                  : 'bg-surface text-gray-400 border-border hover:text-gray-200'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>{type === 'note' ? 'Ideia / Nota' : 'Tarefa'}</span>
            </button>
          </div>

          {/* Ações Finais */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <button
              type="button"
              onClick={async () => {
                if (confirm('Deseja excluir este item?')) {
                  await onDelete(item.id);
                  onClose();
                }
              }}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              <span>Excluir</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2 text-xs font-medium text-gray-400 hover:text-white"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-2 text-xs font-semibold text-black hover:brightness-110 active:scale-95 disabled:opacity-50"
              >
                {isSaving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
