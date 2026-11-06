'use client';

import React, { useState, useMemo } from 'react';
import { Area, Item, EnergyLevel } from '../types';
import { formatDate, formatFriendlyDate } from '../lib/parser';
import { EFFORT_LABELS, ENERGY_LEVELS } from '../lib/constants';
import {
  Calendar,
  Clock,
  Plus,
  Check,
  FileText,
  Lightbulb,
  CheckCircle2,
  CalendarClock,
  ListTodo,
  Sparkles,
  Inbox,
  ArrowRight,
  Send,
  Zap,
  BrainCircuit,
  Bookmark,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface BusinessHubProps {
  areas: Area[];
  items: Item[];
  selectedAreaId: string;
  onSelectArea: (areaId: string) => void;
  onToggleStatus: (id: string, currentStatus: string) => Promise<void>;
  onOpenQuickCapture: (prefillAreaSlug?: string) => void;
  onEditItem: (item: Item) => void;
  onPostpone1Day: (id: string) => Promise<void>;
  onPostponeWeekend: (id: string) => Promise<void>;
  onSendToInbox: (id: string) => Promise<void>;
  onCreateNoteOrDecision: (
    areaId: string,
    title: string,
    type: 'note' | 'decision'
  ) => Promise<void>;
  onConvertNoteToTask: (item: Item) => Promise<void>;
}

type HubTab = 'compromissos' | 'pendencias' | 'anotacoes';

export function BusinessHub({
  areas,
  items,
  selectedAreaId,
  onSelectArea,
  onToggleStatus,
  onOpenQuickCapture,
  onEditItem,
  onPostpone1Day,
  onPostponeWeekend,
  onSendToInbox,
  onCreateNoteOrDecision,
  onConvertNoteToTask,
}: BusinessHubProps) {
  const [activeTab, setActiveTab] = useState<HubTab>('pendencias');
  const [energyFilter, setEnergyFilter] = useState<EnergyLevel | 'all'>('all');

  // Estado para criação rápida de nota/decisão
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteType, setNewNoteType] = useState<'note' | 'decision'>('note');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  // Frente ativa selecionada
  const activeArea = useMemo(() => {
    return areas.find((a) => a.id === selectedAreaId) || areas[0] || null;
  }, [areas, selectedAreaId]);

  // Itens específicos da frente ativa
  const areaItems = useMemo(() => {
    if (!activeArea) return [];
    return items.filter((item) => item.area_id === activeArea.id);
  }, [items, activeArea]);

  // Compromissos: itens ativos com data definida (especialmente com hora marcada ou futuros)
  const appointments = useMemo(() => {
    return areaItems
      .filter(
        (it) =>
          it.status === 'pending' &&
          Boolean(it.scheduled_date)
      )
      .sort((a, b) => {
        const dateA = `${a.scheduled_date || ''} ${a.scheduled_time || '00:00'}`;
        const dateB = `${b.scheduled_date || ''} ${b.scheduled_time || '00:00'}`;
        return dateA.localeCompare(dateB);
      });
  }, [areaItems]);

  // Pendências: tarefas operacionais pendentes
  const pendingTasks = useMemo(() => {
    return areaItems
      .filter((it) => it.type === 'task' && it.status === 'pending')
      .filter((it) => {
        if (energyFilter === 'all') return true;
        return it.energy_level === energyFilter;
      });
  }, [areaItems, energyFilter]);

  // Anotações e Decisões
  const notesAndDecisions = useMemo(() => {
    return areaItems
      .filter(
        (it) =>
          (it.type === 'note' || it.type === 'decision') &&
          it.status !== 'archived'
      )
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [areaItems]);

  if (!activeArea) {
    return (
      <div className="p-8 text-center text-gray-400">
        Nenhuma frente de negócio encontrada.
      </div>
    );
  }

  const handleCheckboxClick = (e: React.MouseEvent, item: Item) => {
    e.stopPropagation();
    try {
      confetti({
        particleCount: 25,
        spread: 50,
        origin: { y: 0.8 },
        colors: [activeArea.color, '#10B981'],
        disableForReducedMotion: true,
      });
    } catch {}
    onToggleStatus(item.id, item.status);
  };

  const handleCreateNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteTitle.trim() || isSubmittingNote) return;

    try {
      setIsSubmittingNote(true);
      await onCreateNoteOrDecision(activeArea.id, newNoteTitle.trim(), newNoteType);
      setNewNoteTitle('');
    } finally {
      setIsSubmittingNote(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. SELETOR DE FRENTES NO TOPO (Pills com cores primárias) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {areas.map((area) => {
          const isSelected = area.id === activeArea.id;
          return (
            <button
              key={area.id}
              onClick={() => onSelectArea(area.id)}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all shrink-0 border ${
                isSelected
                  ? 'bg-card text-white shadow-md'
                  : 'bg-surface/60 text-gray-400 hover:text-gray-200 hover:bg-surface border-border'
              }`}
              style={{
                borderColor: isSelected ? area.color : undefined,
                boxShadow: isSelected ? `0 0 15px -3px ${area.color}30` : undefined,
              }}
            >
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: area.color }}
              />
              <span>{area.name}</span>
            </button>
          );
        })}
      </div>

      {/* 2. BANNER DEDICADO DO NEGÓCIO */}
      <div
        className="rounded-2xl border border-border bg-[#121217] p-5 sm:p-6 shadow-sm relative overflow-hidden"
        style={{
          borderLeftWidth: '6px',
          borderLeftColor: activeArea.color,
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span
                className="h-3.5 w-3.5 rounded-full shrink-0"
                style={{ backgroundColor: activeArea.color }}
              />
              <h2
                className="text-2xl sm:text-3xl font-extrabold tracking-tight"
                style={{ color: activeArea.color }}
              >
                {activeArea.name}
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-gray-400 mt-1 max-w-xl">
              Hub dedicado do negócio: compromissos, tarefas operacionais e registro de decisões.
            </p>
          </div>

          {/* Botão de Nova Entrada no Negócio */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenQuickCapture(activeArea.slug)}
              className="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-black transition-all shadow-md hover:brightness-110 active:scale-95"
              style={{ backgroundColor: activeArea.color }}
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>Nova Entrada em {activeArea.name}</span>
            </button>
          </div>
        </div>

        {/* 3 Métricas Rápidas */}
        <div className="mt-5 grid grid-cols-3 gap-3 border-t border-border/60 pt-4">
          <div className="rounded-xl bg-surface/50 p-3 border border-border/50 text-center sm:text-left">
            <div className="text-[11px] font-semibold text-gray-400">Compromissos</div>
            <div className="text-xl sm:text-2xl font-bold text-white mt-0.5">
              {appointments.length}
            </div>
          </div>
          <div className="rounded-xl bg-surface/50 p-3 border border-border/50 text-center sm:text-left">
            <div className="text-[11px] font-semibold text-gray-400">Pendências</div>
            <div className="text-xl sm:text-2xl font-bold text-white mt-0.5">
              {pendingTasks.length}
            </div>
          </div>
          <div className="rounded-xl bg-surface/50 p-3 border border-border/50 text-center sm:text-left">
            <div className="text-[11px] font-semibold text-gray-400">Anotações / Decisões</div>
            <div className="text-xl sm:text-2xl font-bold text-white mt-0.5">
              {notesAndDecisions.length}
            </div>
          </div>
        </div>
      </div>

      {/* 3. NAVEGAÇÃO DAS 3 ABAS DO HUB */}
      <div className="flex items-center gap-2 border-b border-border/70 pb-3">
        <button
          onClick={() => setActiveTab('pendencias')}
          className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all ${
            activeTab === 'pendencias'
              ? 'bg-card text-white shadow-sm border border-border'
              : 'text-gray-400 hover:text-gray-200 hover:bg-surface/40'
          }`}
          style={{
            color: activeTab === 'pendencias' ? activeArea.color : undefined,
          }}
        >
          <ListTodo className="h-4 w-4" />
          <span>Pendências</span>
          <span className="rounded-full bg-surface px-2 py-0.2 text-[10px] font-bold text-gray-400 border border-border">
            {pendingTasks.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('compromissos')}
          className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all ${
            activeTab === 'compromissos'
              ? 'bg-card text-white shadow-sm border border-border'
              : 'text-gray-400 hover:text-gray-200 hover:bg-surface/40'
          }`}
          style={{
            color: activeTab === 'compromissos' ? activeArea.color : undefined,
          }}
        >
          <CalendarClock className="h-4 w-4" />
          <span>Compromissos</span>
          <span className="rounded-full bg-surface px-2 py-0.2 text-[10px] font-bold text-gray-400 border border-border">
            {appointments.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('anotacoes')}
          className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all ${
            activeTab === 'anotacoes'
              ? 'bg-card text-white shadow-sm border border-border'
              : 'text-gray-400 hover:text-gray-200 hover:bg-surface/40'
          }`}
          style={{
            color: activeTab === 'anotacoes' ? activeArea.color : undefined,
          }}
        >
          <BrainCircuit className="h-4 w-4" />
          <span>Anotações / Decisões</span>
          <span className="rounded-full bg-surface px-2 py-0.2 text-[10px] font-bold text-gray-400 border border-border">
            {notesAndDecisions.length}
          </span>
        </button>
      </div>

      {/* 4. CONTEÚDO DAS ABAS */}

      {/* ABA 1: COMPROMISSOS */}
      {activeTab === 'compromissos' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-gray-400 px-1">
            <span>Compromissos agendados e datas de entrega</span>
            <button
              onClick={() => onOpenQuickCapture(activeArea.slug)}
              className="text-xs font-medium hover:underline flex items-center gap-1"
              style={{ color: activeArea.color }}
            >
              <Plus className="h-3 w-3" />
              <span>Agendar compromisso</span>
            </button>
          </div>

          {appointments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/80 bg-surface/20 p-10 text-center">
              <Calendar className="mx-auto h-8 w-8 text-gray-600 mb-2" />
              <p className="text-sm font-medium text-gray-300">
                Nenhum compromisso agendado para {activeArea.name}
              </p>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                Use a captura rápida para agendar reuniões, pagamentos ou prazos com data e hora.
              </p>
              <button
                onClick={() => onOpenQuickCapture(activeArea.slug)}
                className="mt-4 rounded-xl px-4 py-2 text-xs font-semibold text-black"
                style={{ backgroundColor: activeArea.color }}
              >
                + Adicionar compromisso
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {appointments.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onEditItem(item)}
                  className="group rounded-xl border border-border bg-card p-4 hover:bg-card-hover transition-all cursor-pointer shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  style={{
                    borderLeftWidth: '4px',
                    borderLeftColor: activeArea.color,
                  }}
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {item.scheduled_date && (
                        <span className="flex items-center gap-1 text-xs font-semibold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/25">
                          <Calendar className="h-3.5 w-3.5 text-amber-400" />
                          <span>{formatFriendlyDate(item.scheduled_date)}</span>
                        </span>
                      )}

                      {item.scheduled_time && (
                        <span className="flex items-center gap-1 text-xs font-bold text-indigo-300 bg-indigo-500/15 px-2 py-0.5 rounded border border-indigo-500/30">
                          <Clock className="h-3.5 w-3.5 text-indigo-400" />
                          <span>{item.scheduled_time}</span>
                        </span>
                      )}

                      {item.priority === 'high' && (
                        <span className="text-[10px] font-bold text-red-400 bg-red-500/15 px-1.5 py-0.2 rounded border border-red-500/30">
                          Prioridade Alta (!!)
                        </span>
                      )}
                    </div>

                    <p className="text-sm font-semibold text-white group-hover:text-amber-300 transition-colors">
                      {item.title}
                    </p>
                  </div>

                  {/* Ações do compromisso */}
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1.5 shrink-0 self-end sm:self-center"
                  >
                    <button
                      type="button"
                      onClick={() => onPostpone1Day(item.id)}
                      className="rounded bg-surface hover:bg-surface-hover px-2 py-1 text-[11px] font-medium text-gray-400 hover:text-white border border-border transition-colors"
                      title="Adiar para amanhã (+1 dia)"
                    >
                      +1 dia
                    </button>

                    <button
                      type="button"
                      onClick={() => onPostponeWeekend(item.id)}
                      className="rounded bg-surface hover:bg-surface-hover px-2 py-1 text-[11px] font-medium text-gray-400 hover:text-white border border-border transition-colors"
                      title="Adiar para o fim de semana (+Sáb)"
                    >
                      +fim de semana
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleCheckboxClick(e, item)}
                      title="Concluir compromisso"
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-surface hover:border-emerald-500 hover:bg-emerald-500/20 text-gray-400 hover:text-emerald-400 transition-colors"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ABA 2: PENDÊNCIAS */}
      {activeTab === 'pendencias' && (
        <div className="space-y-4">
          {/* Filtro Anti-Sobrecarga por Nível de Energia Mental (TDAH-friendly) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-surface/40 p-2.5 rounded-xl border border-border">
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <Zap className="h-3.5 w-3.5 text-amber-400" />
              <span>Filtrar por disposição mental:</span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setEnergyFilter('all')}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all ${
                  energyFilter === 'all'
                    ? 'bg-card text-white border border-border'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                Todas
              </button>

              {(['low', 'medium', 'high'] as EnergyLevel[]).map((lvl) => {
                const conf = ENERGY_LEVELS[lvl];
                const isSelected = energyFilter === lvl;
                const icon = lvl === 'low' ? '⚡' : lvl === 'medium' ? '🔥' : '🧠';
                return (
                  <button
                    key={lvl}
                    onClick={() => setEnergyFilter(lvl)}
                    className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all border ${
                      isSelected
                        ? 'bg-card text-white border-border'
                        : 'text-gray-400 hover:text-gray-200 border-transparent'
                    }`}
                  >
                    <span>{icon}</span>
                    <span>{conf.label.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {pendingTasks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/80 bg-surface/20 p-10 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500/60 mb-2" />
              <p className="text-sm font-medium text-gray-300">
                Tudo limpo! Nenhuma pendência em {activeArea.name}
              </p>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                Excelente momento para focar nas outras frentes ou registrar novas tarefas.
              </p>
              <button
                onClick={() => onOpenQuickCapture(activeArea.slug)}
                className="mt-4 rounded-xl px-4 py-2 text-xs font-semibold text-black"
                style={{ backgroundColor: activeArea.color }}
              >
                + Nova tarefa
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {pendingTasks.map((item) => {
                const effortConfig = item.effort ? EFFORT_LABELS[item.effort] : null;
                const subtasks = item.subtasks || [];
                const completedSubs = subtasks.filter((s) => s.completed).length;

                return (
                  <div
                    key={item.id}
                    onClick={() => onEditItem(item)}
                    className="group rounded-xl border border-border bg-card p-3.5 sm:p-4 hover:bg-card-hover transition-all cursor-pointer shadow-sm"
                    style={{
                      borderLeftWidth: '4px',
                      borderLeftColor: activeArea.color,
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        {/* Tags */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {item.scheduled_date && (
                            <span className="flex items-center gap-1 text-[10px] font-medium text-gray-300 bg-surface px-1.5 py-0.5 rounded border border-border">
                              <Calendar className="h-3 w-3 text-amber-400" />
                              <span>{formatFriendlyDate(item.scheduled_date)}</span>
                            </span>
                          )}

                          {item.scheduled_time && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-300 bg-indigo-500/15 px-1.5 py-0.5 rounded border border-indigo-500/30">
                              <Clock className="h-3 w-3 text-indigo-400" />
                              <span>{item.scheduled_time}</span>
                            </span>
                          )}

                          {item.priority === 'high' && (
                            <span className="text-[10px] font-bold text-red-400 bg-red-500/15 px-1.5 py-0.2 rounded border border-red-500/30">
                              Prioridade Alta (!!)
                            </span>
                          )}

                          {effortConfig && (
                            <span
                              className={`text-[10px] font-medium px-1.5 py-0.2 rounded border ${effortConfig.badgeClass}`}
                            >
                              {effortConfig.label}
                            </span>
                          )}

                          {item.energy_level && (
                            <span className="text-[10px] font-medium text-amber-300 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                              {item.energy_level === 'low'
                                ? '⚡'
                                : item.energy_level === 'medium'
                                ? '🔥'
                                : '🧠'}{' '}
                              {ENERGY_LEVELS[item.energy_level].label}
                            </span>
                          )}
                        </div>

                        {/* Título */}
                        <p className="text-sm font-medium text-white group-hover:text-amber-300 transition-colors">
                          {item.title}
                        </p>

                        {/* Micro-passos se houver */}
                        {subtasks.length > 0 && (
                          <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                            <div className="h-1.5 w-24 rounded-full bg-surface overflow-hidden border border-border">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${(completedSubs / subtasks.length) * 100}%`,
                                  backgroundColor: activeArea.color,
                                }}
                              />
                            </div>
                            <span className="text-[11px]">
                              {completedSubs}/{subtasks.length} micro-etapas
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Botão de Conclusão */}
                      <button
                        type="button"
                        onClick={(e) => handleCheckboxClick(e, item)}
                        title="Concluir tarefa"
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gray-600 bg-surface hover:border-emerald-400 hover:bg-emerald-500/20 text-gray-400 hover:text-emerald-400 transition-colors"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Ações rápidas na parte inferior */}
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between gap-2 flex-wrap"
                    >
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onPostpone1Day(item.id)}
                          className="rounded bg-surface hover:bg-surface-hover px-2 py-0.5 text-[10px] font-medium text-gray-400 hover:text-white border border-border transition-colors"
                          title="Adiar 1 dia"
                        >
                          +1 dia
                        </button>
                        <button
                          type="button"
                          onClick={() => onPostponeWeekend(item.id)}
                          className="rounded bg-surface hover:bg-surface-hover px-2 py-0.5 text-[10px] font-medium text-gray-400 hover:text-white border border-border transition-colors"
                          title="Adiar para fim de semana"
                        >
                          +fim de semana
                        </button>
                        <button
                          type="button"
                          onClick={() => onSendToInbox(item.id)}
                          className="rounded bg-surface hover:bg-surface-hover px-2 py-0.5 text-[10px] font-medium text-gray-400 hover:text-cyan-300 border border-border transition-colors flex items-center gap-1"
                          title="Mover de volta para Caixa de Entrada"
                        >
                          <Inbox className="h-2.5 w-2.5" />
                          <span>Inbox</span>
                        </button>
                      </div>


                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ABA 3: ANOTAÇÕES / DECISÕES */}
      {activeTab === 'anotacoes' && (
        <div className="space-y-4">
          {/* Caixa de Entrada Rápida de Ideia ou Decisão */}
          <form
            onSubmit={handleCreateNoteSubmit}
            className="rounded-2xl border border-border bg-[#121217] p-3.5 sm:p-4 shadow-sm space-y-3"
            style={{
              borderLeftWidth: '4px',
              borderLeftColor: activeArea.color,
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                <BrainCircuit className="h-3.5 w-3.5" style={{ color: activeArea.color }} />
                <span>Registrar Ideia ou Decisão em {activeArea.name}</span>
              </span>

              {/* Alternador de Tipo */}
              <div className="flex items-center gap-1 bg-surface p-0.5 rounded-lg border border-border text-[11px]">
                <button
                  type="button"
                  onClick={() => setNewNoteType('note')}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded font-semibold transition-all ${
                    newNoteType === 'note'
                      ? 'bg-card text-amber-300 border border-border'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <Lightbulb className="h-3 w-3 text-amber-400" />
                  <span>Ideia / Nota</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNewNoteType('decision')}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded font-semibold transition-all ${
                    newNoteType === 'decision'
                      ? 'bg-card text-emerald-300 border border-border'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                  <span>Decisão Tomada</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newNoteTitle}
                onChange={(e) => setNewNoteTitle(e.target.value)}
                placeholder={
                  newNoteType === 'note'
                    ? 'Ex: Testar novo cardápio de pães artesanais no inverno...'
                    : 'Ex: Ficou acordado mudar o fornecedor de farinha a partir do dia 15...'
                }
                className="flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-xs sm:text-sm text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!newNoteTitle.trim() || isSubmittingNote}
                className="flex items-center gap-1 rounded-xl px-3.5 py-2 text-xs font-bold text-black transition-all disabled:opacity-40"
                style={{ backgroundColor: activeArea.color }}
              >
                <Send className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Salvar</span>
              </button>
            </div>
            <p className="text-[10px] text-gray-500">
              Pressione Enter para salvar instantaneamente sem burocracia.
            </p>
          </form>

          {/* Mural de Anotações e Decisões */}
          {notesAndDecisions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/80 bg-surface/20 p-10 text-center">
              <Lightbulb className="mx-auto h-8 w-8 text-amber-400/60 mb-2" />
              <p className="text-sm font-medium text-gray-300">
                Nenhuma anotação ou decisão registrada ainda
              </p>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                Registre ideias estratégicas ou decisões tomadas para não perder o raciocínio.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {notesAndDecisions.map((note) => {
                const isDecision = note.type === 'decision';

                return (
                  <div
                    key={note.id}
                    className="rounded-xl border border-border bg-card p-4 hover:bg-card-hover transition-all flex flex-col justify-between shadow-sm space-y-3"
                    style={{
                      borderLeftWidth: '4px',
                      borderLeftColor: activeArea.color,
                    }}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span
                          className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border ${
                            isDecision
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                              : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                          }`}
                        >
                          {isDecision ? (
                            <>
                              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                              <span>Decisão Tomada</span>
                            </>
                          ) : (
                            <>
                              <Lightbulb className="h-3 w-3 text-amber-400" />
                              <span>Ideia / Anotação</span>
                            </>
                          )}
                        </span>

                        <span className="text-[10px] text-gray-500">
                          {new Date(note.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>

                      <p className="text-xs sm:text-sm font-medium text-gray-100 leading-relaxed">
                        {note.title}
                      </p>

                      {note.content && (
                        <p className="text-xs text-gray-400 whitespace-pre-wrap">
                          {note.content}
                        </p>
                      )}
                    </div>

                    {/* Ações da Nota */}
                    <div className="flex items-center justify-between pt-2 border-t border-border/50">
                      <button
                        type="button"
                        onClick={() => onConvertNoteToTask(note)}
                        className="flex items-center gap-1 rounded bg-surface hover:bg-surface-hover px-2.5 py-1 text-[11px] font-semibold text-gray-300 hover:text-white border border-border transition-colors"
                        title="Converter esta anotação em uma tarefa pendente para hoje"
                      >
                        <ArrowRight className="h-3 w-3 text-amber-400" />
                        <span>Fazer Hoje</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onToggleStatus(note.id, note.status)}
                        className="text-[10px] text-gray-500 hover:text-red-400 transition-colors"
                        title="Arquivar anotação"
                      >
                        Arquivar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
