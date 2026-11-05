'use client';

import React from 'react';
import { Area } from '../types';
import { Plus, Database, Sparkles, Inbox, Calendar, CheckCircle2 } from 'lucide-react';

interface NavbarProps {
  currentTab: 'hoje' | 'inbox';
  onTabChange: (tab: 'hoje' | 'inbox') => void;
  inboxCount: number;
  todayCount: number;
  onOpenQuickCapture: () => void;
  onOpenSupabaseConfig: () => void;
  isSupabaseActive: boolean;
}

export function Navbar({
  currentTab,
  onTabChange,
  inboxCount,
  todayCount,
  onOpenQuickCapture,
  onOpenSupabaseConfig,
  isSupabaseActive,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        {/* Logo & Identidade */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 via-purple-500/20 to-cyan-500/20 border border-border">
            <Sparkles className="h-4 w-4 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold tracking-tight text-white">
                Meu Sistema
              </h1>
              <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-medium text-gray-400 border border-border">
                Fase 1
              </span>
            </div>
            <p className="hidden text-xs text-gray-400 sm:block">
              Organização para foco e ação rápida
            </p>
          </div>
        </div>

        {/* Abas Desktop */}
        <nav className="hidden md:flex items-center gap-1 rounded-xl bg-surface p-1 border border-border">
          <button
            onClick={() => onTabChange('hoje')}
            className={`flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-medium transition-all ${
              currentTab === 'hoje'
                ? 'bg-card text-white shadow-sm border border-border'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Calendar className="h-4 w-4 text-amber-400" />
            <span>Hoje</span>
            {todayCount > 0 && (
              <span className="ml-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-300">
                {todayCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onTabChange('inbox')}
            className={`flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-medium transition-all ${
              currentTab === 'inbox'
                ? 'bg-card text-white shadow-sm border border-border'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Inbox className="h-4 w-4 text-cyan-400" />
            <span>Inbox</span>
            {inboxCount > 0 && (
              <span className="ml-1 rounded-full bg-cyan-500/20 px-2 py-0.5 text-xs font-semibold text-cyan-300">
                {inboxCount}
              </span>
            )}
          </button>
        </nav>

        {/* Ações da Direita */}
        <div className="flex items-center gap-2.5">
          {/* Status Supabase */}
          <button
            onClick={onOpenSupabaseConfig}
            title={
              isSupabaseActive
                ? 'Supabase Conectado (Sincronizado)'
                : 'Modo Local Ativo - Clique para conectar ao Supabase'
            }
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors border ${
              isSupabaseActive
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                : 'border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
            }`}
          >
            <Database className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">
              {isSupabaseActive ? 'Supabase' : 'Modo Local'}
            </span>
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isSupabaseActive ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
              }`}
            />
          </button>

          {/* Botão de Captura Rápida (Desktop) */}
          <button
            onClick={onOpenQuickCapture}
            className="hidden sm:flex items-center gap-2 rounded-lg bg-white/10 hover:bg-white/15 px-3 py-1.5 text-xs font-medium text-white transition-all border border-white/10 shadow-sm active:scale-95"
          >
            <Plus className="h-3.5 w-3.5 text-amber-400" />
            <span>Capturar</span>
            <kbd className="ml-1 hidden lg:inline-block rounded bg-background/80 px-1.5 py-0.5 text-[10px] text-gray-400 border border-border">
              ⌘K
            </kbd>
          </button>
        </div>
      </div>
    </header>
  );
}
