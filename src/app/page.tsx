'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Area, Item, ParsedCapture } from '../types';
import {
  fetchAreas,
  fetchItems,
  createItem,
  updateItem,
  deleteItem,
  bringYesterdayToToday,
  postponeItem,
  moveItemToInbox,
} from '../lib/storage';
import { isSupabaseConnected } from '../lib/supabase';
import { formatDate } from '../lib/parser';
import { Navbar } from '../components/Navbar';
import { BottomNav } from '../components/BottomNav';
import { TaskCard } from '../components/TaskCard';
import { QuickCaptureModal } from '../components/QuickCaptureModal';
import { SupabaseConfigModal } from '../components/SupabaseConfigModal';
import { EditItemModal } from '../components/EditItemModal';
import {
  Calendar,
  Inbox,
  AlertCircle,
  Moon,
  Sparkles,
  ArrowRight,
  Plus,
  CheckCircle2,
  Filter,
} from 'lucide-react';

export default function HomePage() {
  const [currentTab, setCurrentTab] = useState<'hoje' | 'inbox'>('hoje');
  const [areas, setAreas] = useState<Area[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSupabaseActive, setIsSupabaseActive] = useState(false);

  // Modais
  const [isQuickCaptureOpen, setIsQuickCaptureOpen] = useState(false);
  const [isSupabaseConfigOpen, setIsSupabaseConfigOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  // Seleção no Inbox via teclado (J / K)
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  // Carregamento inicial de dados
  const loadData = useCallback(async () => {
    try {
      const [loadedAreas, loadedItems] = await Promise.all([
        fetchAreas(),
        fetchItems(),
      ]);
      setAreas(loadedAreas);
      setItems(loadedItems);
      setIsSupabaseActive(isSupabaseConnected());
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const todayStr = useMemo(() => formatDate(new Date()), []);

  // Tarefas atrasadas (de ontem ou antes ainda pendentes)
  const overdueItems = useMemo(() => {
    return items.filter(
      (item) =>
        item.status === 'pending' &&
        item.scheduled_date &&
        item.scheduled_date < todayStr
    );
  }, [items, todayStr]);

  // Tarefas de Hoje (pendentes e concluídas hoje)
  const todayItems = useMemo(() => {
    return items.filter((item) => {
      // Se agendada para hoje
      if (item.scheduled_date === todayStr) return true;
      // Se concluída hoje mesmo
      if (item.completed_at && formatDate(new Date(item.completed_at)) === todayStr) {
        return true;
      }
      return false;
    });
  }, [items, todayStr]);

  // Itens do Inbox: sem frente definida OU sem data definida
  const inboxItems = useMemo(() => {
    return items.filter((item) => {
      if (item.status === 'completed') return false;
      return !item.area_id || !item.scheduled_date;
    });
  }, [items]);

  // Verificação de horário para o aviso noturno (22h até 23h59)
  const isNightReviewTime = useMemo(() => {
    const currentHour = new Date().getHours();
    return currentHour >= 22;
  }, []);

  // Atalho global ⌘K / Ctrl+K e navegação J/K no Inbox
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Se estiver digitando em um input, textarea ou com modal aberto, não intercepta J/K
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      // ⌘K ou Ctrl+K abre captura rápida de qualquer lugar
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsQuickCaptureOpen(true);
        return;
      }

      if (isInput || isQuickCaptureOpen || isSupabaseConfigOpen || editingItem) {
        return;
      }

      // Atalho tecla J (desce) e K (sobe) no Inbox
      if (currentTab === 'inbox' && inboxItems.length > 0) {
        if (e.key === 'j' || e.key === 'J') {
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, inboxItems.length - 1));
        } else if (e.key === 'k' || e.key === 'K') {
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const selected = inboxItems[selectedIndex];
          if (selected) {
            setEditingItem(selected);
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    currentTab,
    inboxItems,
    selectedIndex,
    isQuickCaptureOpen,
    isSupabaseConfigOpen,
    editingItem,
  ]);

  // Ações de persistência
  const handleQuickCaptureSave = async (parsed: ParsedCapture) => {
    const created = await createItem({
      title: parsed.cleanTitle,
      type: parsed.type,
      area_id: parsed.area ? parsed.area.id : null,
      scheduled_date: parsed.scheduledDate,
      scheduled_time: parsed.scheduledTime,
      priority: parsed.priority,
      effort: parsed.effort,
      recurrence: parsed.recurrence,
      status: 'pending',
    });

    setItems((prev) => [created, ...prev]);
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    setItems((prev) =>
      prev.map((i) =>
        i.id === id
          ? {
              ...i,
              status: nextStatus,
              completed_at: nextStatus === 'completed' ? new Date().toISOString() : null,
            }
          : i
      )
    );
    await updateItem(id, { status: nextStatus });
  };

  const handlePostpone = async (id: string, days: number) => {
    const updated = await postponeItem(id, days);
    if (updated) {
      setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
    }
  };

  const handleMoveToInbox = async (id: string) => {
    const updated = await moveItemToInbox(id);
    if (updated) {
      setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
    }
  };

  const handleBringYesterday = async () => {
    await bringYesterdayToToday();
    await loadData();
  };

  const handleSaveEdit = async (id: string, updates: Partial<Item>) => {
    const updated = await updateItem(id, updates);
    if (updated) {
      setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
    }
  };

  const handleDeleteItem = async (id: string) => {
    await deleteItem(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  // Agrupamento das tarefas de hoje por frente
  const todayByArea = useMemo(() => {
    const pendingToday = todayItems.filter((i) => i.status === 'pending');
    const grouped: { area: Area; items: Item[] }[] = [];

    for (const area of areas) {
      const areaTasks = pendingToday.filter((i) => i.area_id === area.id);
      if (areaTasks.length > 0) {
        grouped.push({ area, items: areaTasks });
      }
    }

    // Tarefas de hoje sem frente
    const noAreaTasks = pendingToday.filter((i) => !i.area_id);
    if (noAreaTasks.length > 0) {
      grouped.push({
        area: {
          id: 'sem-frente',
          name: 'Sem Frente Definida',
          slug: 'geral',
          color: '#9CA3AF',
          display_order: 999,
        },
        items: noAreaTasks,
      });
    }

    return grouped;
  }, [todayItems, areas]);

  const completedToday = useMemo(() => {
    return todayItems.filter((i) => i.status === 'completed');
  }, [todayItems]);

  return (
    <div className="min-h-screen bg-background text-gray-100 flex flex-col pb-24 md:pb-12">
      {/* Barra de Navegação Superior */}
      <Navbar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        inboxCount={inboxItems.length}
        todayCount={todayItems.filter((i) => i.status === 'pending').length}
        onOpenQuickCapture={() => setIsQuickCaptureOpen(true)}
        onOpenSupabaseConfig={() => setIsSupabaseConfigOpen(true)}
        isSupabaseActive={isSupabaseActive}
      />

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 sm:px-6 pt-5">
        {/* ============================================================== */}
        {/* AVISO DE TAREFAS DE ONTEM: "trazer tudo pra hoje" */}
        {/* ============================================================== */}
        {overdueItems.length > 0 && currentTab === 'hoje' && (
          <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-200">
                  Sobraram {overdueItems.length} {overdueItems.length === 1 ? 'tarefa' : 'tarefas'} de ontem
                </p>
                <p className="text-xs text-amber-300/80">
                  Sem estresse com acúmulo: traga para hoje com 1 clique para focar no presente.
                </p>
              </div>
            </div>

            <button
              onClick={handleBringYesterday}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2 text-xs font-bold text-black transition-all active:scale-95 shadow-sm"
            >
              <span>Trazer tudo pra hoje</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* ============================================================== */}
        {/* AVISO DISCRETO NOTURNO (22h - 00h): "momento de revisar o dia" */}
        {/* ============================================================== */}
        {isNightReviewTime && currentTab === 'hoje' && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-3 text-xs text-indigo-300">
            <Moon className="h-4 w-4 shrink-0 text-indigo-400" />
            <p>
              <strong>Momento de revisar o dia.</strong> Feche as pendências de hoje ou jogue para amanhã para desacelerar e descansar a cabeça.
            </p>
          </div>
        )}

        {/* ============================================================== */}
        {/* TELA HOJE */}
        {/* ============================================================== */}
        {currentTab === 'hoje' && (
          <div className="space-y-6">
            {/* Título da Tela */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  <span>Hoje</span>
                  <span className="text-xs font-normal text-gray-400">
                    {new Date().toLocaleDateString('pt-BR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}
                  </span>
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Foco absoluto no que é de hoje. Sem montanha de tarefas acumuladas.
                </p>
              </div>

              <button
                onClick={() => setIsQuickCaptureOpen(true)}
                className="flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/15 px-3 py-2 text-xs font-medium text-white transition-colors border border-border"
              >
                <Plus className="h-4 w-4 text-amber-400" />
                <span className="hidden sm:inline">Nova Tarefa</span>
              </button>
            </div>

            {/* Listagem agrupada por Frente */}
            {todayByArea.length === 0 && completedToday.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/80 p-8 sm:p-12 text-center bg-surface/40">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-3">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h3 className="text-base font-semibold text-white">
                  Tudo limpo por hoje!
                </h3>
                <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1">
                  Nenhuma pendência acumulada. Use a captura rápida (⌘K no PC ou botão + no celular) para anotar qualquer nova tarefa ou ideia.
                </p>
                <button
                  onClick={() => setIsQuickCaptureOpen(true)}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-xs font-semibold text-black hover:brightness-110 active:scale-95 transition-all shadow-md"
                >
                  <Plus className="h-4 w-4" />
                  <span>Anotar algo agora</span>
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {todayByArea.map(({ area, items: areaItems }) => (
                  <section key={area.id} className="space-y-2.5">
                    {/* Header da Frente com sua Cor */}
                    <div className="flex items-center gap-2 px-1">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: area.color }}
                      />
                      <h3
                        className="text-xs sm:text-sm font-bold uppercase tracking-wider"
                        style={{ color: area.color }}
                      >
                        {area.name}
                      </h3>
                      <span className="text-[11px] font-semibold text-gray-400 ml-1">
                        ({areaItems.length})
                      </span>
                    </div>

                    {/* Cards de Tarefas da Frente */}
                    <div className="grid gap-2">
                      {areaItems.map((item) => (
                        <TaskCard
                          key={item.id}
                          item={item}
                          area={area}
                          onToggleStatus={handleToggleStatus}
                          onPostpone={handlePostpone}
                          onMoveToInbox={handleMoveToInbox}
                          onEdit={(it) => setEditingItem(it)}
                          onDelete={handleDeleteItem}
                        />
                      ))}
                    </div>
                  </section>
                ))}

                {/* Tarefas Concluídas Hoje */}
                {completedToday.length > 0 && (
                  <div className="pt-4 border-t border-border/60">
                    <details className="group">
                      <summary className="cursor-pointer text-xs font-medium text-gray-500 hover:text-gray-300 flex items-center gap-1.5 select-none">
                        <span>Concluídas hoje ({completedToday.length})</span>
                      </summary>
                      <div className="grid gap-2 mt-3">
                        {completedToday.map((item) => {
                          const area = areas.find((a) => a.id === item.area_id) || null;
                          return (
                            <TaskCard
                              key={item.id}
                              item={item}
                              area={area}
                              onToggleStatus={handleToggleStatus}
                              onPostpone={handlePostpone}
                              onMoveToInbox={handleMoveToInbox}
                              onEdit={(it) => setEditingItem(it)}
                              onDelete={handleDeleteItem}
                            />
                          );
                        })}
                      </div>
                    </details>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TELA INBOX */}
        {/* ============================================================== */}
        {currentTab === 'inbox' && (
          <div className="space-y-5">
            {/* Título e Dicas de Teclado no PC */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  <span>Inbox</span>
                  {inboxItems.length > 0 && (
                    <span className="rounded-full bg-cyan-500/20 px-2.5 py-0.5 text-xs font-bold text-cyan-300 border border-cyan-500/30">
                      {inboxItems.length}
                    </span>
                  )}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Tudo que você anotou na correria sem frente ou data cai aqui para triar em casa com calma.
                </p>
              </div>

              {/* Dica de Teclado (Desktop) */}
              <div className="hidden lg:flex items-center gap-2 text-xs text-gray-400 bg-surface px-3 py-1.5 rounded-xl border border-border">
                <span>Triagem no teclado:</span>
                <kbd className="rounded bg-card px-1.5 py-0.5 text-[11px] font-mono border border-border">
                  J
                </kbd>
                <span>/</span>
                <kbd className="rounded bg-card px-1.5 py-0.5 text-[11px] font-mono border border-border">
                  K
                </kbd>
                <span>navega</span>
                <span>•</span>
                <kbd className="rounded bg-card px-1.5 py-0.5 text-[11px] font-mono border border-border">
                  Enter
                </kbd>
                <span>abre</span>
              </div>
            </div>

            {/* Listagem do Inbox */}
            {inboxItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/80 p-8 sm:p-12 text-center bg-surface/40">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 mb-3">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h3 className="text-base font-semibold text-white">
                  Inbox Zerado!
                </h3>
                <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1">
                  Nenhuma anotação pendente de triagem. Tudo organizado e no seu devido lugar!
                </p>
              </div>
            ) : (
              <div className="grid gap-2.5">
                {inboxItems.map((item, idx) => {
                  const area = areas.find((a) => a.id === item.area_id) || null;
                  const isSelected = idx === selectedIndex;

                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedIndex(idx)}
                      className="cursor-pointer"
                    >
                      <TaskCard
                        item={item}
                        area={area}
                        onToggleStatus={handleToggleStatus}
                        onPostpone={handlePostpone}
                        onMoveToInbox={handleMoveToInbox}
                        onEdit={(it) => setEditingItem(it)}
                        onDelete={handleDeleteItem}
                        isSelected={isSelected}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Navegação Inferior Mobile (iPhone) */}
      <BottomNav
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        inboxCount={inboxItems.length}
        todayCount={todayItems.filter((i) => i.status === 'pending').length}
        onOpenQuickCapture={() => setIsQuickCaptureOpen(true)}
        onOpenSupabaseConfig={() => setIsSupabaseConfigOpen(true)}
      />

      {/* Modal de Captura Rápida (⌘K ou FAB) */}
      <QuickCaptureModal
        isOpen={isQuickCaptureOpen}
        onClose={() => setIsQuickCaptureOpen(false)}
        onSave={handleQuickCaptureSave}
        areas={areas}
      />

      {/* Modal de Configuração do Supabase */}
      <SupabaseConfigModal
        isOpen={isSupabaseConfigOpen}
        onClose={() => setIsSupabaseConfigOpen(false)}
        onConfigSaved={loadData}
      />

      {/* Modal de Edição / Triagem do Item */}
      <EditItemModal
        isOpen={Boolean(editingItem)}
        item={editingItem}
        areas={areas}
        onClose={() => setEditingItem(null)}
        onSave={handleSaveEdit}
        onDelete={handleDeleteItem}
      />
    </div>
  );
}
