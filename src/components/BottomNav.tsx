'use client';

import React, { useState } from 'react';
import { ActiveTab } from '../types';
import {
  Calendar,
  Inbox,
  Plus,
  Settings,
  LayoutGrid,
  CalendarDays,
  Building2,
  MoreHorizontal,
  X,
  FileText,
} from 'lucide-react';

interface BottomNavProps {
  currentTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  inboxCount: number;
  todayCount: number;
  onOpenQuickCapture: () => void;
  onOpenSupabaseConfig?: () => void;
  onOpenCalendarSync?: () => void;
}

export function BottomNav({
  currentTab,
  onTabChange,
  inboxCount,
  todayCount,
  onOpenQuickCapture,
  onOpenSupabaseConfig,
  onOpenCalendarSync,
}: BottomNavProps) {
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Regra anti-ansiedade: contador fica oculto se passar de 20
  const showInboxBadge = inboxCount > 0 && inboxCount <= 20;

  const isMoreTabActive =
    currentTab === 'board' ||
    currentTab === 'semana' ||
    currentTab === 'hub' ||
    currentTab === 'anotacoes';

  return (
    <>
      {/* Menu Drawer suspenso para as outras visões no mobile */}
      {showMoreMenu && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm md:hidden flex flex-col justify-end p-4 animate-in fade-in"
          onClick={() => setShowMoreMenu(false)}
        >
          <div
            className="rounded-2xl border border-border bg-[#121217] p-4 space-y-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                Outras Visões
              </span>
              <button
                onClick={() => setShowMoreMenu(false)}
                className="rounded-lg p-1 text-gray-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <button
              onClick={() => {
                onTabChange('board');
                setShowMoreMenu(false);
              }}
              className={`w-full flex items-center gap-3 rounded-xl p-3 text-xs font-semibold transition-all ${
                currentTab === 'board'
                  ? 'bg-card text-white border border-border'
                  : 'text-gray-300 hover:bg-surface'
              }`}
            >
              <LayoutGrid className="h-4 w-4 text-purple-400" />
              <div className="text-left">
                <div>Painel Operacional</div>
                <div className="text-[10px] text-gray-500 font-normal">
                  Colunas por negócio com os compromissos da semana
                </div>
              </div>
            </button>

            <button
              onClick={() => {
                onTabChange('semana');
                setShowMoreMenu(false);
              }}
              className={`w-full flex items-center gap-3 rounded-xl p-3 text-xs font-semibold transition-all ${
                currentTab === 'semana'
                  ? 'bg-card text-white border border-border'
                  : 'text-gray-300 hover:bg-surface'
              }`}
            >
              <CalendarDays className="h-4 w-4 text-emerald-400" />
              <div className="text-left">
                <div>Grade Semanal</div>
                <div className="text-[10px] text-gray-500 font-normal">
                  Blocos de tempo para identificar buracos e sobrecarga
                </div>
              </div>
            </button>

            <button
              onClick={() => {
                onTabChange('hub');
                setShowMoreMenu(false);
              }}
              className={`w-full flex items-center gap-3 rounded-xl p-3 text-xs font-semibold transition-all ${
                currentTab === 'hub'
                  ? 'bg-card text-white border border-border'
                  : 'text-gray-300 hover:bg-surface'
              }`}
            >
              <Building2 className="h-4 w-4 text-amber-400" />
              <div className="text-left">
                <div>Hub do Negócio</div>
                <div className="text-[10px] text-gray-500 font-normal">
                  Compromissos, pendências e anotações/decisões por empresa
                </div>
              </div>
            </button>

            <button
              onClick={() => {
                onTabChange('anotacoes');
                setShowMoreMenu(false);
              }}
              className={`w-full flex items-center gap-3 rounded-xl p-3 text-xs font-semibold transition-all ${
                currentTab === 'anotacoes'
                  ? 'bg-card text-white border border-border'
                  : 'text-gray-300 hover:bg-surface'
              }`}
            >
              <FileText className="h-4 w-4 text-cyan-400" />
              <div className="text-left">
                <div>Anotações & Ideias</div>
                <div className="text-[10px] text-gray-500 font-normal">
                  Repositório de notas em Markdown e Registro de Decisões
                </div>
              </div>
            </button>

            <button
              onClick={() => {
                onTabChange('configuracoes');
                setShowMoreMenu(false);
              }}
              className={`w-full flex items-center gap-3 rounded-xl p-3 text-xs font-semibold transition-all ${
                currentTab === 'configuracoes'
                  ? 'bg-card text-white border border-border'
                  : 'text-gray-300 hover:bg-surface'
              }`}
            >
              <Settings className="h-4 w-4 text-indigo-400" />
              <div className="text-left">
                <div>Configurações &amp; Backup</div>
                <div className="text-[10px] text-gray-500 font-normal">
                  Base SQLite, backup diário e restauração com trava de segurança
                </div>
              </div>
            </button>

            <div className="pt-2 border-t border-border/60 space-y-1">
              {onOpenCalendarSync && (
                <button
                  onClick={() => {
                    setShowMoreMenu(false);
                    onOpenCalendarSync();
                  }}
                  className="w-full flex items-center gap-3 rounded-xl p-2.5 text-xs font-medium text-indigo-400 hover:text-white hover:bg-surface"
                >
                  <Calendar className="h-4 w-4 text-indigo-400" />
                  <span>Sincronizar Google / Apple Calendar</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Barra de Navegação Inferior Fixa */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-[#0D0D0F]/95 backdrop-blur-xl px-4 py-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-md items-center justify-around relative">
          {/* Aba Hoje */}
          <button
            type="button"
            onClick={() => onTabChange('hoje')}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl cursor-pointer transition-all relative ${
              currentTab === 'hoje'
                ? 'text-amber-400 font-bold'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Calendar className="h-5 w-5" />
            <span className="text-[10px]">Hoje</span>
            {todayCount > 0 && (
              <span className="absolute top-1 right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-500/20 px-1 text-[9px] font-bold text-amber-300 border border-amber-500/30">
                {todayCount}
              </span>
            )}
          </button>

          {/* Aba Caixa de Entrada */}
          <button
            type="button"
            onClick={() => onTabChange('inbox')}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl cursor-pointer transition-all relative ${
              currentTab === 'inbox'
                ? 'text-cyan-400 font-bold'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Inbox className="h-5 w-5" />
            <span className="text-[10px]">Entrada</span>
            {showInboxBadge && (
              <span className="absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-cyan-500/20 px-1 text-[9px] font-bold text-cyan-300 border border-cyan-500/30">
                {inboxCount}
              </span>
            )}
          </button>

          {/* Botão Central de Captura Rápida (FAB no celular) */}
          <div className="relative -top-5">
            <button
              type="button"
              onClick={onOpenQuickCapture}
              aria-label="Captura rápida"
              className="flex h-13 w-13 items-center justify-center rounded-full bg-amber-400 hover:bg-amber-300 text-neutral-950 shadow-md shadow-amber-500/20 cursor-pointer transition-transform active:scale-90 border-2 border-[#0D0D0F]"
            >
              <Plus className="h-7 w-7 stroke-[2.5]" />
            </button>
          </div>

          {/* Mais Visões (Painel / Semana / Hub) */}
          <button
            type="button"
            onClick={() => setShowMoreMenu(true)}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl cursor-pointer transition-all relative ${
              isMoreTabActive
                ? 'text-purple-400 font-bold'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-[10px]">
              {currentTab === 'board'
                ? 'Painel'
                : currentTab === 'semana'
                ? 'Semana'
                : currentTab === 'hub'
                ? 'Hub'
                : 'Visões'}
            </span>
          </button>

          {/* Configurações */}
          <button
            type="button"
            onClick={() => onTabChange('configuracoes')}
            aria-label="Configurações e Backup"
            className={`flex flex-col items-center gap-1 p-2 rounded-xl cursor-pointer transition-colors ${
              currentTab === 'configuracoes'
                ? 'text-indigo-400 font-bold'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Settings className="h-5 w-5" />
            <span className="text-[10px]">Ajustes</span>
          </button>
        </div>
      </nav>
    </>
  );
}
