'use client';

import React from 'react';
import { Area, ActiveTab } from '../types';
import {
  Calendar,
  Inbox,
  Plus,
  Sparkles,
  LayoutGrid,
  CalendarDays,
  Building2,
  ChevronRight,
  FileText,
  Search,
  Settings,
} from 'lucide-react';

interface SidebarProps {
  currentTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  inboxCount: number;
  todayCount: number;
  areas: Area[];
  selectedHubAreaId?: string | null;
  onSelectHubArea?: (areaId: string) => void;
  onOpenQuickCapture: () => void;
  onOpenGlobalSearch?: () => void;
  onOpenSupabaseConfig?: () => void;
  isSupabaseActive?: boolean;
  onOpenCalendarSync?: () => void;
  isCalendarConnected?: boolean;
  isOnline?: boolean;
}

export function Sidebar({
  currentTab,
  onTabChange,
  inboxCount,
  todayCount,
  areas,
  selectedHubAreaId,
  onSelectHubArea,
  onOpenQuickCapture,
  onOpenGlobalSearch,
  onOpenSupabaseConfig,
  isSupabaseActive,
  onOpenCalendarSync,
  isCalendarConnected,
  isOnline = true,
}: SidebarProps) {
  // Regra fundamental: "contador fica oculto se passar de 20 para evitar ansiedade"
  const showInboxBadge = inboxCount > 0 && inboxCount <= 20;

  return (
    <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-border bg-[#101014] p-4 min-h-screen justify-between select-none">
      <div className="space-y-5">
        {/* Cabeçalho do App */}
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface border border-border/80 shadow-sm">
            <Sparkles className="h-4 w-4 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold tracking-tight text-white">
                Meu Sistema
              </span>
              <span className="rounded bg-surface px-1.5 py-0.5 text-[11px] font-medium text-neutral-400 border border-border/70">
                Fase 3
              </span>
            </div>
            <p className="text-xs text-neutral-400 truncate">
              Zero atrito para focar
            </p>
          </div>
        </div>

        {/* Botão de Captura Rápida Instantânea */}
        <button
          onClick={onOpenQuickCapture}
          className="w-full flex items-center justify-between rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-medium p-2.5 text-xs shadow-sm transition-colors active:scale-95"
        >
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>Captura Rápida</span>
          </div>
          <kbd className="rounded bg-black/10 px-1.5 py-0.5 text-xs font-mono font-medium">
            ⌘K
          </kbd>
        </button>

        {/* Botão de Busca Global Instantânea (⌘F) */}
        {onOpenGlobalSearch && (
          <button
            onClick={onOpenGlobalSearch}
            className="w-full flex items-center justify-between rounded-xl bg-surface hover:bg-surface-hover p-2 text-xs font-medium text-neutral-300 border border-border/80 hover:border-neutral-700 shadow-sm active:scale-95 transition-all"
          >
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-neutral-400" />
              <span>Busca Instantânea</span>
            </div>
            <kbd className="rounded bg-card px-1.5 py-0.5 text-xs font-mono text-neutral-400 border border-border">
              ⌘F
            </kbd>
          </button>
        )}

        {/* Navegação Principal */}
        <nav className="space-y-1">
          <div className="px-2 text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
            Visão Geral
          </div>

          {/* Aba Hoje */}
          <button
            type="button"
            onClick={() => onTabChange('hoje')}
            className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium cursor-pointer transition-all ${
              currentTab === 'hoje'
                ? 'bg-card text-white shadow-sm border border-border'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-surface/50'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Calendar className="h-4 w-4 text-amber-400" />
              <span>Hoje</span>
            </div>
            {todayCount > 0 && (
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-300 border border-amber-500/30">
                {todayCount}
              </span>
            )}
          </button>

          {/* Aba Caixa de Entrada */}
          <button
            type="button"
            onClick={() => onTabChange('inbox')}
            className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium cursor-pointer transition-all ${
              currentTab === 'inbox'
                ? 'bg-card text-white shadow-sm border border-border'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-surface/50'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Inbox className="h-4 w-4 text-cyan-400" />
              <span>Caixa de Entrada</span>
            </div>

            {/* Contador simples: Oculto se passar de 20 para evitar ansiedade */}
            {showInboxBadge && (
              <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-xs font-semibold text-cyan-300 border border-cyan-500/30">
                {inboxCount}
              </span>
            )}
          </button>

          {/* Painel Operacional */}
          <button
            type="button"
            onClick={() => onTabChange('board')}
            className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium cursor-pointer transition-all ${
              currentTab === 'board'
                ? 'bg-card text-white shadow-sm border border-border'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-surface/50'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <LayoutGrid className="h-4 w-4 text-purple-400" />
              <span>Painel Operacional</span>
            </div>
          </button>

          {/* Grade Semanal */}
          <button
            type="button"
            onClick={() => onTabChange('semana')}
            className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium cursor-pointer transition-all ${
              currentTab === 'semana'
                ? 'bg-card text-white shadow-sm border border-border'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-surface/50'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <CalendarDays className="h-4 w-4 text-emerald-400" />
              <span>Grade Semanal</span>
            </div>
          </button>

          {/* Hub do Negócio */}
          <button
            type="button"
            onClick={() => onTabChange('hub')}
            className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium cursor-pointer transition-all ${
              currentTab === 'hub'
                ? 'bg-card text-white shadow-sm border border-border'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-surface/50'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Building2 className="h-4 w-4 text-amber-400" />
              <span>Hub do Negócio</span>
            </div>
          </button>

          {/* Anotações e Ideias */}
          <button
            type="button"
            onClick={() => onTabChange('anotacoes')}
            className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium cursor-pointer transition-all ${
              currentTab === 'anotacoes'
                ? 'bg-card text-white shadow-sm border border-border'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-surface/50'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <FileText className="h-4 w-4 text-cyan-400" />
              <span>Anotações & Ideias</span>
            </div>
          </button>

          {/* Configurações & Backup */}
          <button
            type="button"
            onClick={() => onTabChange('configuracoes')}
            className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium cursor-pointer transition-all ${
              currentTab === 'configuracoes'
                ? 'bg-card text-white shadow-sm border border-border'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-surface/50'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Settings className="h-4 w-4 text-indigo-400" />
              <span>Configurações</span>
            </div>
          </button>
        </nav>

        {/* Frentes / Negócios Dedicados */}
        <div className="space-y-1.5 pt-3 border-t border-border/60">
          <div className="px-2 text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
            Minhas Frentes
          </div>
          <div className="space-y-1">
            {areas.map((a) => {
              const isSelectedInHub = currentTab === 'hub' && selectedHubAreaId === a.id;

              return (
                <button
                  type="button"
                  key={a.id}
                  onClick={() => {
                    if (onSelectHubArea) onSelectHubArea(a.id);
                    onTabChange('hub');
                  }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all text-left ${
                    isSelectedInHub
                      ? 'bg-card text-white shadow-sm border border-border'
                      : 'text-gray-300 hover:bg-surface/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: a.color }}
                    />
                    <span className="truncate">{a.name}</span>
                  </div>
                  <ChevronRight className="h-3 w-3 text-gray-500 shrink-0 opacity-0 group-hover:opacity-100" />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Rodapé com Sincronização */}
      {onOpenCalendarSync && (
        <div className="pt-4 border-t border-border/60">
          <button
            onClick={onOpenCalendarSync}
            className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-colors border ${
              !isOnline
                ? 'border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
                : isCalendarConnected
                ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20'
                : 'border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-indigo-400" />
              <span>
                {!isOnline
                  ? 'Offline (SQLite)'
                  : isCalendarConnected
                  ? 'Google Calendar'
                  : 'Sincronizar Agenda'}
              </span>
            </div>
            <span
              className={`h-2 w-2 rounded-full ${
                !isOnline
                  ? 'bg-amber-400'
                  : isCalendarConnected
                  ? 'bg-emerald-400'
                  : 'bg-neutral-600'
              }`}
            />
          </button>
        </div>
      )}
    </aside>
  );
}
