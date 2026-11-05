'use client';

import React from 'react';
import { Calendar, Inbox, Plus, Settings } from 'lucide-react';

interface BottomNavProps {
  currentTab: 'hoje' | 'inbox';
  onTabChange: (tab: 'hoje' | 'inbox') => void;
  inboxCount: number;
  todayCount: number;
  onOpenQuickCapture: () => void;
  onOpenSupabaseConfig: () => void;
}

export function BottomNav({
  currentTab,
  onTabChange,
  inboxCount,
  todayCount,
  onOpenQuickCapture,
  onOpenSupabaseConfig,
}: BottomNavProps) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur-xl px-4 py-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto flex max-w-md items-center justify-around relative">
        {/* Aba Hoje */}
        <button
          onClick={() => onTabChange('hoje')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all relative ${
            currentTab === 'hoje'
              ? 'text-amber-400 font-semibold'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <Calendar className="h-5 w-5" />
          <span className="text-[11px]">Hoje</span>
          {todayCount > 0 && (
            <span className="absolute top-1 right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-500/20 px-1 text-[10px] font-bold text-amber-300 border border-amber-500/30">
              {todayCount}
            </span>
          )}
        </button>

        {/* Botão Central de Captura Rápida (FAB no celular) */}
        <div className="relative -top-5">
          <button
            onClick={onOpenQuickCapture}
            aria-label="Captura rápida"
            className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-400 text-black shadow-lg shadow-amber-500/30 transition-transform active:scale-90 hover:brightness-110 border-2 border-background"
          >
            <Plus className="h-7 w-7 stroke-[2.5]" />
          </button>
        </div>

        {/* Aba Inbox */}
        <button
          onClick={() => onTabChange('inbox')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all relative ${
            currentTab === 'inbox'
              ? 'text-cyan-400 font-semibold'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <Inbox className="h-5 w-5" />
          <span className="text-[11px]">Inbox</span>
          {inboxCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-cyan-500/20 px-1 text-[10px] font-bold text-cyan-300 border border-cyan-500/30">
              {inboxCount}
            </span>
          )}
        </button>

        {/* Config / Supabase */}
        <button
          onClick={onOpenSupabaseConfig}
          aria-label="Configuração e sincronização"
          className="flex flex-col items-center gap-1 p-2 rounded-xl text-gray-500 hover:text-gray-300 transition-colors"
        >
          <Settings className="h-5 w-5" />
          <span className="text-[11px]">Sync</span>
        </button>
      </div>
    </nav>
  );
}
