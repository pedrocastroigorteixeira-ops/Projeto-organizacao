'use client';

import React, { useState, useEffect } from 'react';
import { Area, EffortType, Item, ItemType, PriorityType } from '../types';
import { EFFORT_LABELS } from '../lib/constants';
import { formatDate } from '../lib/parser';
import {
  X,
  Calendar,
  Clock,
  Zap,
  Tag,
  AlertCircle,
  Trash2,
  Inbox,
  Check,
  FileText,
} from 'lucide-react';

interface EditItemModalProps {
  isOpen: boolean;
  item: Item | null;
  areas: Area[];
  onClose: () => void;
  onSave: (id: string, updates: Partial<Item>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function EditItemModal({
  isOpen,
  item,
  areas,
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
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (item && isOpen) {
      setTitle(item.title);
      setAreaId(item.area_id);
      setScheduledDate(item.scheduled_date);
      setScheduledTime(item.scheduled_time || '');
      setPriority(item.priority);
      setEffort(item.effort);
      setType(item.type);
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
