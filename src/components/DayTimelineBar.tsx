'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Item } from '../types';
import { Clock, Sun, Moon, Sparkles, CheckCircle2 } from 'lucide-react';

interface DayTimelineBarProps {
  scheduledItems: Item[]; // Itens de hoje com horário marcado
}

export function DayTimelineBar({ scheduledItems }: DayTimelineBarProps) {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    // Atualiza o relógio a cada 30 segundos
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Definição do expediente comercial padrão: 08:00 às 18:00
  const START_HOUR = 8;
  const END_HOUR = 18;
  const START_MINUTES = START_HOUR * 60; // 480 min
  const END_MINUTES = END_HOUR * 60; // 1080 min
  const TOTAL_WORK_MINUTES = END_MINUTES - START_MINUTES; // 600 min (10 horas)

  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();

  // Cálculo da porcentagem do expediente percorrida
  const progressPercent = useMemo(() => {
    if (currentMinutes <= START_MINUTES) return 0;
    if (currentMinutes >= END_MINUTES) return 100;
    return Math.min(
      100,
      Math.max(0, ((currentMinutes - START_MINUTES) / TOTAL_WORK_MINUTES) * 100)
    );
  }, [currentMinutes, START_MINUTES, END_MINUTES, TOTAL_WORK_MINUTES]);

  // Tempo restante de expediente
  const remainingTimeText = useMemo(() => {
    if (currentMinutes < START_MINUTES) {
      const diffMin = START_MINUTES - currentMinutes;
      const h = Math.floor(diffMin / 60);
      const m = diffMin % 60;
      return `Expediente começa em ${h > 0 ? `${h}h ` : ''}${m}min (às 08:00)`;
    }
    if (currentMinutes >= END_MINUTES) {
      return 'Expediente comercial encerrado (18h) • Hora de desacelerar';
    }
    const diffMin = END_MINUTES - currentMinutes;
    const h = Math.floor(diffMin / 60);
    const m = diffMin % 60;
    return `Restam ${h}h ${m}min de expediente útil até as 18:00`;
  }, [currentMinutes, START_MINUTES, END_MINUTES]);

  const formattedCurrentTime = useMemo(() => {
    const hours = String(currentTime.getHours()).padStart(2, '0');
    const minutes = String(currentTime.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }, [currentTime]);

  // Marcadores de compromissos com horário no expediente
  const markers = useMemo(() => {
    return scheduledItems
      .filter((item) => item.scheduled_time)
      .map((item) => {
        const [h, m] = item.scheduled_time!.split(':').map(Number);
        const itemMinutes = h * 60 + (m || 0);
        let pct = ((itemMinutes - START_MINUTES) / TOTAL_WORK_MINUTES) * 100;
        pct = Math.max(2, Math.min(98, pct));
        const isPast = itemMinutes < currentMinutes;
        return {
          id: item.id,
          title: item.title,
          time: item.scheduled_time,
          percent: pct,
          isPast,
        };
      });
  }, [scheduledItems, START_MINUTES, TOTAL_WORK_MINUTES, currentMinutes]);

  const isAfterWork = currentMinutes >= END_MINUTES;

  return (
    <div className="rounded-2xl border border-border bg-[#121217] p-3.5 sm:p-4 shadow-sm select-none">
      {/* Cabeçalho da Barra de Momento */}
      <div className="flex items-center justify-between flex-wrap gap-2 text-xs mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="h-3.5 w-3.5" />
          </div>
          <span className="font-semibold text-gray-200">
            Momento do Dia
          </span>
          <span className="text-[11px] text-gray-500 hidden sm:inline">
            (Expediente 08h - 18h)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full border ${
              isAfterWork
                ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300'
                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
            }`}
          >
            {isAfterWork ? (
              <Moon className="h-3.5 w-3.5 text-indigo-400" />
            ) : (
              <Sun className="h-3.5 w-3.5 text-amber-400" />
            )}
            <span>{remainingTimeText}</span>
          </span>
        </div>
      </div>

      {/* Régua Visual / Linha do Tempo: Passado / Agora / Próximo */}
      <div className="relative my-4">
        {/* Trilho de fundo (Expediente) */}
        <div className="h-2.5 w-full rounded-full bg-[#1C1C26] border border-border/80 overflow-hidden relative">
          {/* Barra de Progresso do Passado */}
          <div
            className="h-full bg-gradient-to-r from-emerald-500/60 via-amber-500/70 to-orange-500/80 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Marcadores de compromissos com horário */}
        {markers.map((m) => (
          <div
            key={m.id}
            title={`${m.time} - ${m.title}`}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 group"
            style={{ left: `${m.percent}%` }}
          >
            <div
              className={`h-3 w-1.5 rounded-full transition-all ${
                m.isPast
                  ? 'bg-gray-500'
                  : 'bg-indigo-400 ring-2 ring-indigo-500/50 shadow-sm'
              }`}
            />
            {/* Tooltip no hover */}
            <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block whitespace-nowrap rounded-lg bg-black px-2 py-1 text-[10px] text-white border border-border shadow-xl z-20">
              <span className="font-bold text-indigo-300">{m.time}</span> - {m.title}
            </div>
          </div>
        ))}

        {/* Marcador do "Agora" (Ponteiro do momento presente) */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 pointer-events-none flex flex-col items-center"
          style={{ left: `${Math.max(2, Math.min(98, progressPercent))}%` }}
        >
          {/* Ponto brilhante */}
          <div className="h-4 w-4 rounded-full bg-amber-400 ring-4 ring-amber-500/30 border-2 border-[#121217] shadow-lg shadow-amber-500/50 animate-pulse" />
        </div>
      </div>

      {/* Legendas das 3 Fases: Passado / Agora / Próximo */}
      <div className="flex items-center justify-between text-[11px] text-gray-400 pt-0.5">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500/70" />
          <span>Passado</span>
          <span className="text-[10px] text-gray-500">(08:00)</span>
        </div>

        <div className="flex items-center gap-1 text-amber-300 font-semibold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
          <span>Agora</span>
          <span className="font-mono">({formattedCurrentTime})</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span>Próximo</span>
          <span className="text-[10px] text-gray-500">(18:00)</span>
          <span className="h-2 w-2 rounded-full bg-cyan-500/70" />
        </div>
      </div>
    </div>
  );
}
