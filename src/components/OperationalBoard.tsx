'use client';

import React, { useState, useMemo } from 'react';
import { Area, Item } from '../types';
import { formatDate, formatFriendlyDate } from '../lib/parser';
import { EFFORT_LABELS } from '../lib/constants';
import {
  Calendar,
  Clock,
  Plus,
  Check,
  Zap,
  Flame,
  AlertCircle,
  Filter,
  CheckCircle2,
  CalendarDays,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface OperationalBoardProps {
  areas: Area[];
  items: Item[];
  onToggleStatus: (id: string, currentStatus: string) => Promise<void>;
  onStartFocus: (taskId: string) => void;
  onOpenQuickCapture: (prefillAreaSlug?: string) => void;
  onEditItem: (item: Item) => void;
}

export function OperationalBoard({
  areas,
  items,
  onToggleStatus,
  onStartFocus,
  onOpenQuickCapture,
  onEditItem,
}: OperationalBoardProps) {
  const [filterScope, setFilterScope] = useState<'week' | 'all'>('week');

  const todayStr = useMemo(() => formatDate(new Date()), []);

  // Calcula limites da semana atual (de hoje até daqui a 7 dias)
  const next7DaysStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return formatDate(d);
  }, []);

  // Itens filtrados para o board
  const boardItems = useMemo(() => {
    return items.filter((item) => {
      if (item.status === 'completed' || item.status === 'archived') return false;
      if (filterScope === 'week') {
        if (!item.scheduled_date) return false;
        return item.scheduled_date >= todayStr && item.scheduled_date <= next7DaysStr;
      }
      return true;
    });
  }, [items, filterScope, todayStr, next7DaysStr]);

  const handleCheckboxClick = (e: React.MouseEvent, item: Item, area: Area) => {
    e.stopPropagation();
    try {
      confetti({
        particleCount: 25,
        spread: 50,
        origin: { y: 0.8 },
        colors: [area.color, '#10B981'],
        disableForReducedMotion: true,
      });
    } catch {}
    onToggleStatus(item.id, item.status);
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho do Painel Operacional */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <span>Painel Operacional</span>
            <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-semibold text-gray-400 border border-border">
              Visão por Negócio
            </span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Acompanhe compromissos e prioridades de cada empresa lado a lado.
          </p>
        </div>

        {/* Filtro da Semana vs Todas as Ativas */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-xl bg-surface p-1 border border-border">
            <button
              onClick={() => setFilterScope('week')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                filterScope === 'week'
                  ? 'bg-card text-white shadow-sm border border-border'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <CalendarDays className="h-3.5 w-3.5 text-amber-400" />
              <span>Esta Semana</span>
            </button>

            <button
              onClick={() => setFilterScope('all')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                filterScope === 'all'
                  ? 'bg-card text-white shadow-sm border border-border'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Todas as Pendências
            </button>
          </div>
        </div>
      </div>

      {/* Grid de Colunas por Negócio / Projeto */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
        {areas.map((area) => {
          const areaTasks = boardItems.filter((i) => i.area_id === area.id);

          return (
            <div
              key={area.id}
              className="flex flex-col rounded-2xl border border-border bg-[#121217] shadow-sm overflow-hidden"
            >
              {/* Top Bar colorido da Coluna */}
              <div
                className="h-1.5 w-full"
                style={{ backgroundColor: area.color }}
              />

              {/* Cabeçalho da Coluna do Negócio */}
              <div className="p-3.5 border-b border-border/80 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: area.color }}
                  />
                  <h3
                    className="text-xs sm:text-sm font-bold uppercase tracking-wider truncate"
                    style={{ color: area.color }}
                  >
                    {area.name}
                  </h3>
                  <span className="text-[11px] font-bold text-gray-500">
                    ({areaTasks.length})
                  </span>
                </div>

                <button
                  onClick={() => onOpenQuickCapture(area.slug)}
                  title={`Adicionar tarefa em ${area.name}`}
                  className="flex h-6 w-6 items-center justify-center rounded-lg bg-surface hover:bg-surface-hover text-gray-400 hover:text-white border border-border transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Lista de Cards da Coluna */}
              <div className="p-3 space-y-2.5 max-h-[70vh] overflow-y-auto">
                {areaTasks.length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-border/60 rounded-xl bg-surface/20">
                    <p className="text-xs text-gray-500">
                      Nenhum compromisso nesta semana.
                    </p>
                    <button
                      onClick={() => onOpenQuickCapture(area.slug)}
                      className="mt-2 text-[11px] font-medium hover:underline"
                      style={{ color: area.color }}
                    >
                      + Anotar algo aqui
                    </button>
                  </div>
                ) : (
                  areaTasks.map((item) => {
                    const effortConfig = item.effort ? EFFORT_LABELS[item.effort] : null;

                    return (
                      <div
                        key={item.id}
                        onClick={() => onEditItem(item)}
                        className="group relative rounded-xl border border-border bg-card p-3 hover:bg-card-hover hover:border-border-focus transition-all cursor-pointer shadow-sm"
                        style={{
                          borderLeftWidth: '4px',
                          borderLeftColor: area.color,
                        }}
                      >
                        {/* Tags do Item */}
                        <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                          {/* Data */}
                          {item.scheduled_date && (
                            <span className="flex items-center gap-1 text-[10px] font-medium text-gray-300 bg-surface px-1.5 py-0.5 rounded border border-border">
                              <Calendar className="h-3 w-3 text-amber-400" />
                              <span>{formatFriendlyDate(item.scheduled_date)}</span>
                            </span>
                          )}

                          {/* Horário marcado */}
                          {item.scheduled_time && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-300 bg-indigo-500/15 px-1.5 py-0.5 rounded border border-indigo-500/30">
                              <Clock className="h-3 w-3 text-indigo-400" />
                              <span>{item.scheduled_time}</span>
                            </span>
                          )}

                          {/* Urgente */}
                          {item.priority === 'high' && (
                            <span className="text-[10px] font-bold text-red-400 bg-red-500/15 px-1 py-0.2 rounded border border-red-500/30">
                              !!
                            </span>
                          )}

                          {/* Esforço */}
                          {effortConfig && (
                            <span
                              className={`text-[10px] font-medium px-1.5 py-0.2 rounded border ${effortConfig.badgeClass}`}
                            >
                              {effortConfig.label}
                            </span>
                          )}
                        </div>

                        {/* Título do Card */}
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs sm:text-sm font-medium text-gray-100 group-hover:text-white leading-snug">
                            {item.title}
                          </p>

                          <button
                            type="button"
                            onClick={(e) => handleCheckboxClick(e, item, area)}
                            title="Concluir tarefa"
                            className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-gray-600 bg-surface hover:border-emerald-400 hover:bg-emerald-500/20"
                          >
                            <Check className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 text-emerald-400" />
                          </button>
                        </div>

                        {/* Botão de Foco rápido no card */}
                        <div className="mt-2.5 pt-2 border-t border-border/50 flex items-center justify-end">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onStartFocus(item.id);
                            }}
                            className="flex items-center gap-1 rounded bg-surface hover:bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-gray-400 hover:text-amber-300 border border-border hover:border-amber-500/30 transition-all"
                            title="Abrir em Hiperfoco (F)"
                          >
                            <Flame className="h-3 w-3 text-amber-400" />
                            <span>Hiperfoco</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
