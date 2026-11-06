'use client';

import React, { useState, useMemo } from 'react';
import { Area, Item } from '../types';
import { formatDate } from '../lib/parser';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Calendar,
  AlertTriangle,
  Sparkles,
  Coffee,
  Plus,
  Flame,
} from 'lucide-react';

interface WeeklyGridProps {
  areas: Area[];
  items: Item[];
  onStartFocus: (taskId: string) => void;
  onOpenQuickCapture: (prefillDate?: string) => void;
  onEditItem: (item: Item) => void;
}

interface DayColumn {
  date: Date;
  dateStr: string;
  dayName: string;
  dayNumber: number;
  isToday: boolean;
  isWeekend: boolean;
}

export function WeeklyGrid({
  areas,
  items,
  onStartFocus,
  onOpenQuickCapture,
  onEditItem,
}: WeeklyGridProps) {
  // Deslocamento da semana em relação à semana atual (0 = atual, -1 = anterior, 1 = próxima)
  const [weekOffset, setWeekOffset] = useState<number>(0);

  const todayStr = useMemo(() => formatDate(new Date()), []);

  // Calcula os 7 dias da semana (Segunda a Domingo)
  const weekDays = useMemo<DayColumn[]>(() => {
    const now = new Date();
    // Ajusta conforme weekOffset
    now.setDate(now.getDate() + weekOffset * 7);

    // Encontra a Segunda-feira da semana (getDay(): 0=Dom, 1=Seg, ..., 6=Sáb)
    const currentDay = now.getDay();
    const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;

    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);

    const days: DayColumn[] = [];
    const dayNames = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = formatDate(d);

      days.push({
        date: d,
        dateStr,
        dayName: dayNames[i],
        dayNumber: d.getDate(),
        isToday: dateStr === todayStr,
        isWeekend: i >= 5,
      });
    }

    return days;
  }, [weekOffset, todayStr]);

  // Itens da semana organizados por dia
  const itemsByDay = useMemo(() => {
    const map = new Map<string, Item[]>();

    for (const d of weekDays) {
      const dayTasks = items.filter(
        (it) =>
          it.scheduled_date === d.dateStr &&
          it.status !== 'completed' &&
          it.status !== 'archived'
      );
      map.set(d.dateStr, dayTasks);
    }

    return map;
  }, [items, weekDays]);

  // Mapeamento por turnos (Manhã: 08-12h, Tarde: 12-18h, Noite: 18h+)
  const getPeriod = (time: string | null): 'morning' | 'afternoon' | 'evening' | 'flex' => {
    if (!time) return 'flex';
    const hour = parseInt(time.split(':')[0], 10);
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  };

  return (
    <div className="space-y-6 select-none">
      {/* Cabeçalho da Grade Semanal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <span>Grade Semanal</span>
            <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-semibold text-gray-400 border border-border">
              Blocos de Tempo
            </span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Identifique buracos na agenda para focar e evite dias sobrecarregados.
          </p>
        </div>

        {/* Navegação entre semanas */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-xl bg-surface p-1 border border-border">
            <button
              onClick={() => setWeekOffset((prev) => prev - 1)}
              className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-surface-hover transition-colors"
              title="Semana anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <button
              onClick={() => setWeekOffset(0)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                weekOffset === 0
                  ? 'bg-card text-white border border-border'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Esta Semana
            </button>

            <button
              onClick={() => setWeekOffset((prev) => prev + 1)}
              className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-surface-hover transition-colors"
              title="Próxima semana"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Grade de 7 Colunas (Segunda a Domingo) */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-3 items-start overflow-x-auto">
        {weekDays.map((day) => {
          const dayItems = itemsByDay.get(day.dateStr) || [];
          const timedItems = dayItems.filter((i) => Boolean(i.scheduled_time));

          // Diagnóstico de Sobrecarga e Buracos
          const isOverloaded = dayItems.length >= 4 || timedItems.length >= 3;
          const isBalanced = dayItems.length >= 1 && dayItems.length < 4;
          const isEmpty = dayItems.length === 0;

          const morningTasks = dayItems.filter((i) => getPeriod(i.scheduled_time) === 'morning');
          const afternoonTasks = dayItems.filter((i) => getPeriod(i.scheduled_time) === 'afternoon');
          const eveningTasks = dayItems.filter((i) => getPeriod(i.scheduled_time) === 'evening');
          const flexTasks = dayItems.filter((i) => getPeriod(i.scheduled_time) === 'flex');

          return (
            <div
              key={day.dateStr}
              className={`flex flex-col rounded-2xl border transition-all ${
                day.isToday
                  ? 'border-amber-500/60 bg-[#16161F] ring-2 ring-amber-500/20 shadow-lg'
                  : day.isWeekend
                  ? 'border-border/60 bg-[#101014]/80'
                  : 'border-border bg-[#121217]'
              }`}
            >
              {/* Header do Dia */}
              <div className="p-3 border-b border-border/80 text-center space-y-1">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold uppercase tracking-wider ${
                      day.isToday ? 'text-amber-400' : 'text-gray-400'
                    }`}
                  >
                    {day.dayName}
                  </span>

                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-mono font-bold ${
                      day.isToday
                        ? 'bg-amber-400 text-black shadow-md'
                        : 'text-gray-300'
                    }`}
                  >
                    {day.dayNumber}
                  </span>
                </div>

                {/* Termômetro de Carga do Dia */}
                <div className="pt-1">
                  {isOverloaded ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-300 bg-red-500/15 px-2 py-0.5 rounded-full border border-red-500/30">
                      <AlertTriangle className="h-3 w-3 text-red-400" />
                      Sobrecarga
                    </span>
                  ) : isBalanced ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      Equilibrado ({dayItems.length})
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-500 bg-surface px-2 py-0.5 rounded-full border border-border">
                      Livre
                    </span>
                  )}
                </div>
              </div>

              {/* BLOCOS DE TEMPO DO DIA */}
              <div className="p-2 space-y-2 text-xs">
                {/* 1. MANHÃ (08h - 12h) */}
                <div className="rounded-xl border border-border/50 bg-[#16161C] p-2 space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] text-gray-400 font-semibold uppercase">
                    <span>Manhã (08-12h)</span>
                  </div>

                  {morningTasks.length > 0 ? (
                    morningTasks.map((it) => {
                      const area = areas.find((a) => a.id === it.area_id) || null;
                      return (
                        <div
                          key={it.id}
                          onClick={() => onEditItem(it)}
                          className="rounded-lg p-1.5 bg-card hover:bg-card-hover border border-border transition-all cursor-pointer group"
                          style={{
                            borderLeftWidth: '3px',
                            borderLeftColor: area ? area.color : '#8B5CF6',
                          }}
                        >
                          <div className="flex items-center justify-between gap-1 text-[10px] text-indigo-300 font-mono font-bold">
                            <span>{it.scheduled_time}</span>
                            {area && (
                              <span style={{ color: area.color }} className="text-[9px] uppercase font-bold truncate">
                                {area.name.split(' ')[0]}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] font-medium text-gray-100 group-hover:text-white leading-tight mt-0.5 truncate">
                            {it.title}
                          </p>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-2 text-center text-[10px] text-gray-500 border border-dashed border-border/40 rounded-lg">
                      <span className="text-gray-400">Horário livre</span>
                    </div>
                  )}
                </div>

                {/* 2. TARDE (12h - 18h) */}
                <div className="rounded-xl border border-border/50 bg-[#16161C] p-2 space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] text-gray-400 font-semibold uppercase">
                    <span>Tarde (12-18h)</span>
                  </div>

                  {afternoonTasks.length > 0 ? (
                    afternoonTasks.map((it) => {
                      const area = areas.find((a) => a.id === it.area_id) || null;
                      return (
                        <div
                          key={it.id}
                          onClick={() => onEditItem(it)}
                          className="rounded-lg p-1.5 bg-card hover:bg-card-hover border border-border transition-all cursor-pointer group"
                          style={{
                            borderLeftWidth: '3px',
                            borderLeftColor: area ? area.color : '#8B5CF6',
                          }}
                        >
                          <div className="flex items-center justify-between gap-1 text-[10px] text-indigo-300 font-mono font-bold">
                            <span>{it.scheduled_time}</span>
                            {area && (
                              <span style={{ color: area.color }} className="text-[9px] uppercase font-bold truncate">
                                {area.name.split(' ')[0]}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] font-medium text-gray-100 group-hover:text-white leading-tight mt-0.5 truncate">
                            {it.title}
                          </p>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-2 text-center text-[10px] text-gray-500 border border-dashed border-border/40 rounded-lg">
                      <span className="text-gray-400">Horário livre</span>
                    </div>
                  )}
                </div>

                {/* 3. NOITE (18h+) */}
                {eveningTasks.length > 0 && (
                  <div className="rounded-xl border border-border/50 bg-[#16161C] p-2 space-y-1.5">
                    <div className="text-[10px] text-gray-400 font-semibold uppercase">
                      <span>Noite (18h+)</span>
                    </div>

                    {eveningTasks.map((it) => {
                      const area = areas.find((a) => a.id === it.area_id) || null;
                      return (
                        <div
                          key={it.id}
                          onClick={() => onEditItem(it)}
                          className="rounded-lg p-1.5 bg-card hover:bg-card-hover border border-border transition-all cursor-pointer group"
                          style={{
                            borderLeftWidth: '3px',
                            borderLeftColor: area ? area.color : '#8B5CF6',
                          }}
                        >
                          <div className="flex items-center justify-between gap-1 text-[10px] text-indigo-300 font-mono font-bold">
                            <span>{it.scheduled_time}</span>
                          </div>
                          <p className="text-[11px] font-medium text-gray-100 group-hover:text-white leading-tight mt-0.5 truncate">
                            {it.title}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 4. TAREFAS FLEXÍVEIS DO DIA (SEM HORA MARCADA) */}
                {flexTasks.length > 0 && (
                  <div className="rounded-xl border border-border/40 bg-surface/40 p-2 space-y-1">
                    <div className="text-[10px] text-gray-400 font-semibold uppercase">
                      Flexíveis ({flexTasks.length})
                    </div>
                    {flexTasks.map((it) => {
                      const area = areas.find((a) => a.id === it.area_id) || null;
                      return (
                        <div
                          key={it.id}
                          onClick={() => onEditItem(it)}
                          className="rounded-lg p-1 bg-card hover:bg-card-hover border border-border text-[11px] font-medium text-gray-200 truncate cursor-pointer"
                          style={{
                            borderLeftWidth: '3px',
                            borderLeftColor: area ? area.color : '#4B5563',
                          }}
                        >
                          {it.title}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Botão para agendar rápido neste dia */}
                <button
                  onClick={() => onOpenQuickCapture(` ${day.dayName.toLowerCase()} `)}
                  className="w-full py-1 text-[11px] text-gray-400 hover:text-white hover:bg-surface/60 rounded-lg border border-dashed border-border/60 transition-colors flex items-center justify-center gap-1"
                >
                  <Plus className="h-3 w-3" />
                  <span>Agendar</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
