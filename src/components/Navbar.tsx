'use client';

import React from 'react';
import { ActiveTab } from '../types';
import {
  Plus,
  Sparkles,
  Inbox,
  Calendar,
  LayoutGrid,
  CalendarDays,
  Building2,
  FileText,
  Search,
  WifiOff,
  Settings,
} from 'lucide-react';

interface NavbarProps {
  currentTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  inboxCount: number;
  todayCount: number;
  onOpenQuickCapture: () => void;
  onOpenGlobalSearch?: () => void;
  onOpenSupabaseConfig?: () => void;
  isSupabaseActive?: boolean;
  onOpenCalendarSync?: () => void;
  isCalendarConnected?: boolean;
  isOnline?: boolean;
}

export function Navbar({
  currentTab,
  onTabChange,
  inboxCount,
  todayCount,
  onOpenQuickCapture,
  onOpenGlobalSearch,
  onOpenSupabaseConfig,
  isSupabaseActive,
  onOpenCalendarSync,
  isCalendarConnected,
  isOnline = true,
}: NavbarProps) {
  // Regra de ouro anti-ansiedade: contador fica oculto se passar de 20
  const showInboxBadge = inboxCount > 0 && inboxCount <= 20;

  return (
    <header className="sticky top-0 z-30 w-full border-b border-border bg-[#0D0D0F]/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 sm:h-16 max-w-7xl items-center justify-between px-3 sm:px-6 gap-2">
        {/* Identidade Mobile */}
        <div className="flex items-center gap-2 md:hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-surface border border-border/80">
            <Sparkles className="h-4 w-4 text-amber-400" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-white hidden sm:inline">
            Meu Sistema
          </span>
        </div>

        {/* Abas Superiores com scroll horizontal suave no mobile */}
        <nav className="flex items-center gap-1 rounded-xl bg-surface p-1 border border-border/80 overflow-x-auto scrollbar-none max-w-full">
          <button
            type="button"
            onClick={() => onTabChange('hoje')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-medium cursor-pointer transition-all shrink-0 ${
              currentTab === 'hoje'
                ? 'bg-card text-white shadow-sm border border-border'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Calendar className="h-3.5 w-3.5 text-amber-400" />
            <span>Hoje</span>
            {todayCount > 0 && (
              <span className="ml-0.5 rounded-full bg-amber-500/20 px-1.5 py-0.2 text-[11px] font-semibold text-amber-300">
                {todayCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onTabChange('inbox')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-medium cursor-pointer transition-all shrink-0 ${
              currentTab === 'inbox'
                ? 'bg-card text-white shadow-sm border border-border'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Inbox className="h-3.5 w-3.5 text-cyan-400" />
            <span>Entrada</span>
            {showInboxBadge && (
              <span className="ml-0.5 rounded-full bg-cyan-500/20 px-1.5 py-0.2 text-[11px] font-semibold text-cyan-300">
                {inboxCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onTabChange('board')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-medium cursor-pointer transition-all shrink-0 ${
              currentTab === 'board'
                ? 'bg-card text-white shadow-sm border border-border'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5 text-purple-400" />
            <span>Painel</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('semana')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-medium cursor-pointer transition-all shrink-0 ${
              currentTab === 'semana'
                ? 'bg-card text-white shadow-sm border border-border'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <CalendarDays className="h-3.5 w-3.5 text-emerald-400" />
            <span>Semana</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('hub')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-medium cursor-pointer transition-all shrink-0 ${
              currentTab === 'hub'
                ? 'bg-card text-white shadow-sm border border-border'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Building2 className="h-3.5 w-3.5 text-amber-400" />
            <span>Hub</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('anotacoes')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-medium cursor-pointer transition-all shrink-0 ${
              currentTab === 'anotacoes'
                ? 'bg-card text-white shadow-sm border border-border'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <FileText className="h-3.5 w-3.5 text-cyan-400" />
            <span>Notas</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('configuracoes')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-medium cursor-pointer transition-all shrink-0 ${
              currentTab === 'configuracoes'
                ? 'bg-card text-white shadow-sm border border-border'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Settings className="h-3.5 w-3.5 text-indigo-400" />
            <span>Configurações</span>
          </button>
        </nav>

        {/* Ações da Direita */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Botão de Busca Instantânea */}
          {onOpenGlobalSearch && (
            <button
              onClick={onOpenGlobalSearch}
              title="Busca instantânea por qualquer palavra-chave (⌘F)"
              className="flex items-center gap-1.5 rounded-xl bg-surface hover:bg-surface-hover text-gray-300 p-2 sm:px-2.5 sm:py-1.5 text-xs font-medium border border-border transition-all active:scale-95"
            >
              <Search className="h-3.5 w-3.5 text-gray-400" />
              <kbd className="hidden sm:inline-block ml-0.5 rounded bg-card px-1 py-0.2 text-[9px] font-mono text-gray-400 border border-border">
                ⌘F
              </kbd>
            </button>
          )}

          {/* Sincronização Google / Apple Calendar */}
          {onOpenCalendarSync && (
            <button
              onClick={onOpenCalendarSync}
              title={
                !isOnline
                  ? 'Modo Offline - Gravando no SQLite local'
                  : isCalendarConnected
                  ? 'Google Calendar Sincronizado'
                  : 'Sincronizar com Google / Apple Calendar'
              }
              className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium transition-colors border ${
                !isOnline
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                  : isCalendarConnected
                  ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20'
                  : 'border-neutral-700 bg-neutral-800/80 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {!isOnline ? (
                <WifiOff className="h-3.5 w-3.5 text-amber-400" />
              ) : (
                <Calendar className="h-3.5 w-3.5 text-indigo-400" />
              )}
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  !isOnline
                    ? 'bg-amber-400'
                    : isCalendarConnected
                    ? 'bg-emerald-400'
                    : 'bg-neutral-500'
                }`}
              />
            </button>
          )}


          {/* Botão de Captura Rápida (Desktop) */}
          <button
            onClick={onOpenQuickCapture}
            className="hidden lg:flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/15 px-3 py-1.5 text-xs font-semibold text-white transition-all border border-white/10 shadow-sm active:scale-95"
          >
            <Plus className="h-3.5 w-3.5 text-amber-400" />
            <span>Capturar</span>
            <kbd className="ml-1 rounded bg-background/80 px-1.5 py-0.5 text-xs font-mono text-neutral-400 border border-border">
              ⌘K
            </kbd>
          </button>
        </div>
      </div>
    </header>
  );
}
