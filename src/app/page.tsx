'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Area, Item, ParsedCapture, ActiveTab } from '../types';
import {
  fetchAreas,
  fetchItems,
  createItem,
  updateItem,
  deleteItem,
  bringYesterdayToToday,
  postponeAllYesterday,
  postponeAllYesterdayToWeekend,
  postponeItem,
  postponeToWeekend,
  moveItemToInbox,
  completeItemWithRecurrence,
} from '../lib/storage';
import { isSupabaseConnected } from '../lib/supabase';
import { formatDate } from '../lib/parser';
import { checkRecurrenceDueStatus } from '../lib/recurrence';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { BottomNav } from '../components/BottomNav';
import { TaskCard } from '../components/TaskCard';
import { InboxItemCard } from '../components/InboxItemCard';
import { QuickCaptureModal } from '../components/QuickCaptureModal';
import { SupabaseConfigModal } from '../components/SupabaseConfigModal';
import { EditItemModal } from '../components/EditItemModal';
import { QuickContextModal } from '../components/QuickContextModal';
import { OperationalBoard } from '../components/OperationalBoard';
import { WeeklyGrid } from '../components/WeeklyGrid';
import { BusinessHub } from '../components/BusinessHub';
import { NotesAndDecisionsView } from '../components/NotesAndDecisionsView';
import { GlobalSearchModal } from '../components/GlobalSearchModal';
import { CalendarSyncModal } from '../components/CalendarSyncModal';
import { SettingsAndBackupView } from '../components/SettingsAndBackupView';
import {
  Calendar,
  Inbox,
  AlertCircle,
  Moon,
  Sparkles,
  ArrowRight,
  Plus,
  CheckCircle2,
  Clock,
  Keyboard,
  SunMedium,
  ChevronDown,
  ChevronUp,
  BellRing,
  Repeat,
} from 'lucide-react';

export default function HomePage() {
  // A tela inicial é sempre o "Hoje" por padrão
  const [currentTab, setCurrentTab] = useState<ActiveTab>('hoje');
  const [areas, setAreas] = useState<Area[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSupabaseActive, setIsSupabaseActive] = useState(false);

  // Hub do Negócio - Frente selecionada
  const [selectedHubAreaId, setSelectedHubAreaId] = useState<string>('divino-pao');

  // Modais
  const [isQuickCaptureOpen, setIsQuickCaptureOpen] = useState(false);
  const [quickCaptureInitialInput, setQuickCaptureInitialInput] = useState<string>('');
  const [isSupabaseConfigOpen, setIsSupabaseConfigOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [contextualizingItem, setContextualizingItem] = useState<Item | null>(null);
  const [isCalendarSyncOpen, setIsCalendarSyncOpen] = useState(false);
  const [isCalendarConnected, setIsCalendarConnected] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // Controle de exibição das pendências de ontem (expandir/recolher)
  const [showOverdueDrawer, setShowOverdueDrawer] = useState(false);

  // Seleção no Inbox via teclado (J / K)
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  // Notificação / Toast sutil para feedback de ações de teclado
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2200);
  }, []);

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

      // Espelha itens no banco SQLite local em segundo plano
      if (loadedItems && loadedItems.length > 0) {
        fetch('/api/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(loadedItems),
        }).catch(() => {});
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Monitoramento de conectividade (Offline / Online) e status do Google Calendar
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);

      const checkCalendarStatus = async () => {
        try {
          const res = await fetch('/api/sync/status');
          if (res.ok) {
            const data = await res.json();
            setIsCalendarConnected(Boolean(data?.google?.connected));
          }
        } catch (e) {
          // Servidor ou rede offline
        }
      };

      checkCalendarStatus();

      const handleOnline = () => {
        setIsOnline(true);
        showToast('🟢 Conexão restabelecida! Sincronizando com SQLite e Google...');
        // Dispara sync em background
        fetch('/api/sync/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items }),
        })
          .then((r) => r.json())
          .then((data) => {
            if (data?.pulledItems?.length > 0) {
              setItems((prev) => [...data.pulledItems, ...prev]);
              showToast(`📅 ${data.pulledItems.length} novo(s) compromisso(s) do Google integrados!`);
            }
          })
          .catch(() => {});
      };

      const handleOffline = () => {
        setIsOnline(false);
        showToast('🟡 Modo Offline: gravando no SQLite local sem interrupções.');
      };

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      // Checa retorno do fluxo OAuth na URL
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get('calendar_connected') === 'sucesso') {
        setIsCalendarConnected(true);
        showToast('🎉 Google Calendar conectado com sucesso ao SQLite local!');
        window.history.replaceState({}, '', window.location.pathname);
      } else if (searchParams.get('calendar_error')) {
        showToast(`⚠️ Erro na integração Google: ${searchParams.get('calendar_error')}`);
        window.history.replaceState({}, '', window.location.pathname);
      }

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, [items, showToast]);

  const todayStr = useMemo(() => formatDate(new Date()), []);

  // Tarefas atrasadas (de ontem ou anteriores não cumpridas):
  // Não acumula automaticamente na lista de hoje! Fica guardada para decisão no banner discreto.
  const overdueItems = useMemo(() => {
    return items.filter(
      (item) =>
        item.status === 'pending' &&
        item.scheduled_date &&
        item.scheduled_date < todayStr
    );
  }, [items, todayStr]);

  // Tarefas e compromissos exclusivamente de Hoje
  // Regra TDAH: rituais recorrentes surgem apenas na data certa,
  // ou na janela de lembrete antecipado configurada para obrigações financeiras.
  const todayItems = useMemo(() => {
    return items.filter((item) => {
      if (item.completed_at && formatDate(new Date(item.completed_at)) === todayStr) {
        return true;
      }
      if (item.status === 'completed' || item.status === 'archived') {
        return false;
      }
      const dueStatus = checkRecurrenceDueStatus(item, todayStr);
      return dueStatus.isDueToday || dueStatus.isWarning;
    });
  }, [items, todayStr]);

  // Obrigações em aviso antecipado (ex: vence em 2 dias)
  const advanceWarningItems = useMemo(() => {
    return todayItems.filter((item) => {
      if (item.status !== 'pending') return false;
      const dueStatus = checkRecurrenceDueStatus(item, todayStr);
      return dueStatus.isWarning;
    });
  }, [todayItems, todayStr]);

  // 1. Compromissos com horário marcado de Hoje (ordenados cronologicamente, excluindo avisos antecipados com bloco próprio)
  const todayTimedItems = useMemo(() => {
    return todayItems
      .filter((item) => {
        if (!item.scheduled_time || item.status !== 'pending') return false;
        const dueStatus = checkRecurrenceDueStatus(item, todayStr);
        return dueStatus.isDueToday;
      })
      .sort((a, b) => (a.scheduled_time! > b.scheduled_time! ? 1 : -1));
  }, [todayItems, todayStr]);

  // 2. Lista restrita de tarefas prioritárias do dia por negócio (sem horário fixo, excluindo avisos antecipados)
  const todayUntimedItems = useMemo(() => {
    return todayItems.filter((item) => {
      if (item.scheduled_time || item.status !== 'pending') return false;
      const dueStatus = checkRecurrenceDueStatus(item, todayStr);
      return dueStatus.isDueToday;
    });
  }, [todayItems, todayStr]);

  // Itens da Caixa de Entrada
  const inboxItems = useMemo(() => {
    return items.filter((item) => {
      if (item.status === 'completed' || item.status === 'archived') return false;
      return !item.area_id || !item.scheduled_date;
    });
  }, [items]);

  useEffect(() => {
    if (inboxItems.length > 0 && selectedIndex >= inboxItems.length) {
      setSelectedIndex(Math.max(0, inboxItems.length - 1));
    }
  }, [inboxItems.length, selectedIndex]);

  // ==============================================================
  // AÇÕES RÁPIDAS DA CAIXA DE ENTRADA
  // ==============================================================

  const handleMoveToToday = useCallback(
    async (id: string) => {
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, scheduled_date: todayStr } : i))
      );
      showToast('Jogado para Fazer Hoje (Tab) ➔');
      await updateItem(id, { scheduled_date: todayStr });
    },
    [todayStr, showToast]
  );

  const handleArchiveOrComplete = useCallback(
    async (id: string) => {
      const completedAt = new Date().toISOString();
      setItems((prev) =>
        prev.map((i) =>
          i.id === id ? { ...i, status: 'completed', completed_at: completedAt } : i
        )
      );
      showToast('Marcado como feito / arquivado (D) ✓');
      await updateItem(id, { status: 'completed', completed_at: completedAt });
    },
    [showToast]
  );

  const handleSaveContext = useCallback(
    async (id: string, updates: Partial<Item>) => {
      const updated = await updateItem(id, updates);
      if (updated) {
        setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
        showToast('Contextualizado com sucesso! ✨');
      }
    },
    [showToast]
  );

  // ==============================================================
  // TRIAGEM NO TECLADO (CAIXA DE ENTRADA)
  // ==============================================================
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsQuickCaptureOpen(true);
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsSearchModalOpen(true);
        return;
      }

      if (
        isQuickCaptureOpen ||
        isSupabaseConfigOpen ||
        isSearchModalOpen ||
        editingItem ||
        contextualizingItem
      ) {
        return;
      }

      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;
      if (isInput) return;

      if (currentTab === 'inbox' && inboxItems.length > 0) {
        const currentSelected = inboxItems[selectedIndex];

        if (e.key === 'j' || e.key === 'J') {
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, inboxItems.length - 1));
          return;
        }

        if (e.key === 'k' || e.key === 'K') {
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          return;
        }

        if (e.key === 'Tab') {
          e.preventDefault();
          if (currentSelected) {
            handleMoveToToday(currentSelected.id);
          }
          return;
        }

        if (e.key === 'd' || e.key === 'D') {
          e.preventDefault();
          if (currentSelected) {
            handleArchiveOrComplete(currentSelected.id);
          }
          return;
        }

        if (e.key === 'Enter') {
          e.preventDefault();
          if (currentSelected) {
            setContextualizingItem(currentSelected);
          }
          return;
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
    contextualizingItem,
    handleMoveToToday,
    handleArchiveOrComplete,
  ]);

  const openQuickCaptureWithPrefill = useCallback((prefillAreaSlug?: string) => {
    if (prefillAreaSlug) {
      setQuickCaptureInitialInput(`#${prefillAreaSlug} `);
    } else {
      setQuickCaptureInitialInput('');
    }
    setIsQuickCaptureOpen(true);
  }, []);

  // Criação rápida de anotação ou decisão no Hub do Negócio
  const handleCreateNoteOrDecision = useCallback(
    async (areaId: string, title: string, type: 'note' | 'decision') => {
      const created = await createItem({
        title,
        type,
        area_id: areaId,
        scheduled_date: null,
        scheduled_time: null,
        priority: 'normal',
        effort: null,
        recurrence: null,
        status: 'pending',
      });
      setItems((prev) => [created, ...prev]);
      showToast(
        type === 'decision'
          ? 'Decisão registrada com sucesso! 🎯'
          : 'Ideia anotada no negócio! 💡'
      );
    },
    [showToast]
  );

  // Converter nota/ideia em tarefa com prazo para Hoje
  const handleConvertNoteToTask = useCallback(
    async (item: Item) => {
      const updated = await updateItem(item.id, {
        type: 'task',
        scheduled_date: todayStr,
      });
      if (updated) {
        setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
        showToast('Convertido em tarefa para Hoje! ➔');
      }
    },
    [todayStr, showToast]
  );

  // Ações de persistência da tela Hoje
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
      advance_warning_days: parsed.advanceWarningDays,
      is_recurring: parsed.isRecurring,
      status: 'pending',
    });

    setItems((prev) => [created, ...prev]);

    // Espelha no SQLite local e fila de sincronização
    fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(created),
    }).catch(() => {});

    showToast(
      created.scheduled_date === todayStr
        ? 'Salvo em Hoje! 📅'
        : 'Salvo na Caixa de Entrada! 📥'
    );
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    if (currentStatus === 'completed') {
      // Reabrir tarefa
      const updated = await updateItem(id, { status: 'pending', completed_at: null });
      if (updated) {
        setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
        showToast('Tarefa reaberta!');
      }
    } else {
      // Concluir tarefa (com preservação de próxima ocorrência se for recorrente)
      const { completedItem, nextOccurrence } = await completeItemWithRecurrence(id);
      if (completedItem) {
        setItems((prev) => {
          const list = prev.map((i) => (i.id === id ? completedItem : i));
          return nextOccurrence ? [nextOccurrence, ...list] : list;
        });

        if (nextOccurrence) {
          showToast('Concluído! Próxima ocorrência agendada 🔄');
        } else {
          showToast('Tarefa concluída! ✨');
        }
      }
    }
  };

  const handlePostpone = async (id: string, days: number) => {
    const updated = await postponeItem(id, days);
    if (updated) {
      setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
      showToast(days === 1 ? 'Adiado para amanhã (+1 dia)' : `Adiado (+${days} dias)`);
    }
  };

  const handlePostponeToWeekend = async (id: string) => {
    const updated = await postponeToWeekend(id);
    if (updated) {
      setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
      showToast('Adiado para o fim de semana (+fim de semana) ☀️');
    }
  };

  const handleMoveToInbox = async (id: string) => {
    const updated = await moveItemToInbox(id);
    if (updated) {
      setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
      showToast('Voltou para a Caixa de Entrada 📥');
    }
  };

  // Ações da Barra de Pendências de Ontem
  const handleBringAllOverdueToToday = async () => {
    await bringYesterdayToToday();
    await loadData();
    setShowOverdueDrawer(false);
    showToast('Pendências de ontem movidas para hoje!');
  };

  const handlePostponeAllOverdue = async (days: number = 1) => {
    await postponeAllYesterday(days);
    await loadData();
    setShowOverdueDrawer(false);
    showToast('Pendências adiadas para amanhã (+1 dia)!');
  };

  const handlePostponeAllOverdueToWeekend = async () => {
    await postponeAllYesterdayToWeekend();
    await loadData();
    setShowOverdueDrawer(false);
    showToast('Pendências adiadas para o próximo fim de semana!');
  };

  const handleSaveEdit = async (id: string, updates: Partial<Item>) => {
    const updated = await updateItem(id, updates);
    if (updated) {
      setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
      fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      }).catch(() => {});
    }
  };

  const handleDeleteItem = async (id: string) => {
    await deleteItem(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id }),
    }).catch(() => {});
    showToast('Item excluído');
  };

  // Agrupamento das tarefas de hoje por negócio (ordenando prioritárias primeiro)
  const todayByArea = useMemo(() => {
    const grouped: { area: Area; items: Item[] }[] = [];

    for (const area of areas) {
      // Prioritárias do negócio no dia
      const areaTasks = todayUntimedItems
        .filter((i) => i.area_id === area.id)
        .sort((a, b) => {
          if (a.priority === 'high' && b.priority !== 'high') return -1;
          if (a.priority !== 'high' && b.priority === 'high') return 1;
          return 0;
        });

      if (areaTasks.length > 0) {
        grouped.push({ area, items: areaTasks });
      }
    }

    // Tarefas sem negócio associado
    const noAreaTasks = todayUntimedItems
      .filter((i) => !i.area_id)
      .sort((a, b) => (a.priority === 'high' ? -1 : 1));

    if (noAreaTasks.length > 0) {
      grouped.push({
        area: {
          id: 'sem-frente',
          name: 'Geral / Outros',
          slug: 'geral',
          color: '#9CA3AF',
          display_order: 999,
        },
        items: noAreaTasks,
      });
    }

    return grouped;
  }, [todayUntimedItems, areas]);

  const completedToday = useMemo(() => {
    return todayItems.filter((i) => i.status === 'completed');
  }, [todayItems]);

  return (
    <div className="min-h-screen bg-[#0D0D0F] text-gray-100 flex flex-col md:flex-row pb-24 md:pb-0">
      {/* Barra Lateral Desktop (Sidebar) */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        inboxCount={inboxItems.length}
        todayCount={todayItems.filter((i) => i.status === 'pending').length}
        areas={areas}
        selectedHubAreaId={selectedHubAreaId}
        onSelectHubArea={setSelectedHubAreaId}
        onOpenQuickCapture={() => openQuickCaptureWithPrefill()}
        onOpenGlobalSearch={() => setIsSearchModalOpen(true)}
        onOpenSupabaseConfig={() => setIsSupabaseConfigOpen(true)}
        isSupabaseActive={isSupabaseActive}
        onOpenCalendarSync={() => setIsCalendarSyncOpen(true)}
        isCalendarConnected={isCalendarConnected}
        isOnline={isOnline}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Barra Superior Mobile */}
        <div className="md:hidden">
          <Navbar
            currentTab={currentTab}
            onTabChange={setCurrentTab}
            inboxCount={inboxItems.length}
            todayCount={todayItems.filter((i) => i.status === 'pending').length}
            onOpenQuickCapture={() => openQuickCaptureWithPrefill()}
            onOpenGlobalSearch={() => setIsSearchModalOpen(true)}
            onOpenSupabaseConfig={() => setIsSupabaseConfigOpen(true)}
            isSupabaseActive={isSupabaseActive}
            onOpenCalendarSync={() => setIsCalendarSyncOpen(true)}
            isCalendarConnected={isCalendarConnected}
            isOnline={isOnline}
          />
        </div>

        {/* Conteúdo Principal */}
        <main
          className={`mx-auto w-full flex-1 px-4 sm:px-6 pt-5 sm:pt-7 ${
            currentTab === 'board' ||
            currentTab === 'semana' ||
            currentTab === 'hub' ||
            currentTab === 'anotacoes' ||
            currentTab === 'configuracoes'
              ? 'max-w-7xl'
              : 'max-w-4xl'
          }`}
        >
          {/* TOAST FLUTUANTE DE FEEDBACK RÁPIDO DO TECLADO */}
          {toastMessage && (
            <div className="fixed top-5 right-5 z-50 flex items-center gap-2 rounded-xl border border-cyan-500/40 bg-[#161B26]/95 px-4 py-2.5 text-xs font-semibold text-cyan-200 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2">
              <Sparkles className="h-4 w-4 text-cyan-400" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* ============================================================== */}
          {/* TELA HOJE (TELA INICIAL PADRÃO) */}
          {/* ============================================================== */}
          {currentTab === 'hoje' && (
            <div className="space-y-6">
              {/* ============================================================== */}
              {/* BARRA DISCRETA NO TOPO PARA PENDÊNCIAS DE ONTEM */}
              {/* "Se sobraram tarefas não cumpridas de ontem: não acumula na lista. Mostra barra discreta" */}
              {/* ============================================================== */}
              {overdueItems.length > 0 && (
                <div className="rounded-2xl border border-amber-500/30 bg-[#171410] p-4 shadow-sm space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
                        <AlertCircle className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-semibold text-amber-200">
                          {overdueItems.length} {overdueItems.length === 1 ? 'pendência de ontem' : 'pendências de ontem'}. Deseja mover para hoje ou adiar?
                        </p>
                        <p className="text-xs text-neutral-400 mt-0.5">
                          Suas tarefas de ontem não poluem o dia de hoje automaticamente.
                        </p>
                      </div>
                    </div>

                    {/* Botões de Ação Imediata da Barra de Ontem */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={handleBringAllOverdueToToday}
                        className="rounded-xl bg-amber-400 hover:bg-amber-300 px-3 py-1.5 text-xs font-medium text-neutral-950 transition-colors active:scale-95 shadow-sm"
                      >
                        Mover para hoje
                      </button>

                      <button
                        onClick={() => handlePostponeAllOverdue(1)}
                        className="rounded-xl bg-surface hover:bg-surface-hover text-gray-200 px-3 py-1.5 text-xs font-medium border border-border transition-all active:scale-95"
                      >
                        +1 dia
                      </button>

                      <button
                        onClick={handlePostponeAllOverdueToWeekend}
                        className="rounded-xl bg-surface hover:bg-surface-hover text-gray-200 px-3 py-1.5 text-xs font-medium border border-border transition-all active:scale-95 flex items-center gap-1"
                      >
                        <SunMedium className="h-3 w-3 text-cyan-400" />
                        <span>+fim de semana</span>
                      </button>

                      <button
                        onClick={() => setShowOverdueDrawer(!showOverdueDrawer)}
                        className="rounded-xl p-1.5 text-gray-400 hover:text-white"
                        title={showOverdueDrawer ? 'Recolher pendências' : 'Ver pendências de ontem'}
                      >
                        {showOverdueDrawer ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Gaveta expansível de pendências de ontem para triagem item a item */}
                  {showOverdueDrawer && (
                    <div className="pt-3 border-t border-border/60 grid gap-2">
                      <span className="text-[11px] font-semibold text-gray-400">
                        Pendências que ficaram para trás:
                      </span>
                      {overdueItems.map((item) => {
                        const area = areas.find((a) => a.id === item.area_id) || null;
                        return (
                          <TaskCard
                            key={item.id}
                            item={item}
                            area={area}
                            onToggleStatus={handleToggleStatus}
                            onPostpone={handlePostpone}
                            onPostponeToWeekend={handlePostponeToWeekend}
                            onMoveToInbox={handleMoveToInbox}
                            onEdit={(it) => setEditingItem(it)}
                            onDelete={handleDeleteItem}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Cabeçalho da Tela Hoje */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                    <span>Hoje</span>
                    <span className="text-xs font-normal text-gray-400 capitalize">
                      {new Date().toLocaleDateString('pt-BR', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                      })}
                    </span>
                  </h2>
                  <p className="text-xs text-neutral-400 mt-1">
                    Compromissos agendados e lista prioritária do dia.
                  </p>
                </div>

                <button
                  onClick={() => setIsQuickCaptureOpen(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/15 px-3 py-2 text-xs font-semibold text-white transition-colors border border-border"
                >
                  <Plus className="h-4 w-4 text-amber-400" />
                  <span className="hidden sm:inline">Nova Tarefa</span>
                </button>
              </div>

              {/* ============================================================== */}
              {/* LEMBRETE ANTECIPADO: OBRIGAÇÕES FINANCEIRAS COM VENCIMENTO PRÓXIMO */}
              {/* ============================================================== */}
              {advanceWarningItems.length > 0 && (
                <section className="rounded-2xl border border-amber-500/35 bg-[#171410] p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
                        <BellRing className="h-3.5 w-3.5" />
                      </div>
                      <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-amber-200">
                        Lembrete Antecipado • Obrigações Financeiras ({advanceWarningItems.length})
                      </h3>
                    </div>
                    <span className="text-[10px] text-gray-400">
                      Vencimento próximo
                    </span>
                  </div>

                  <div className="grid gap-2">
                    {advanceWarningItems.map((item) => {
                      const area = areas.find((a) => a.id === item.area_id) || null;
                      return (
                        <TaskCard
                          key={item.id}
                          item={item}
                          area={area}
                          onToggleStatus={handleToggleStatus}
                          onPostpone={handlePostpone}
                          onPostponeToWeekend={handlePostponeToWeekend}
                          onMoveToInbox={handleMoveToInbox}
                          onEdit={(it) => setEditingItem(it)}
                          onDelete={handleDeleteItem}
                        />
                      );
                    })}
                  </div>
                </section>
              )}

              {/* ============================================================== */}
              {/* 1. COMPROMISSOS COM HORÁRIO MARCADO (EXCLUSIVAMENTE) */}
              {/* ============================================================== */}
              {todayTimedItems.length > 0 && (
                <section className="space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <Clock className="h-4 w-4 text-neutral-400" />
                    <h3 className="text-xs sm:text-sm font-semibold tracking-wide text-neutral-200">
                      Compromissos com Horário Marcado
                    </h3>
                    <span className="text-xs font-medium text-neutral-400">
                      ({todayTimedItems.length})
                    </span>
                  </div>

                  <div className="grid gap-2">
                    {todayTimedItems.map((item) => {
                      const area = areas.find((a) => a.id === item.area_id) || null;
                      return (
                        <TaskCard
                          key={item.id}
                          item={item}
                          area={area}
                          onToggleStatus={handleToggleStatus}
                          onPostpone={handlePostpone}
                          onPostponeToWeekend={handlePostponeToWeekend}
                          onMoveToInbox={handleMoveToInbox}
                          onEdit={(it) => setEditingItem(it)}
                          onDelete={handleDeleteItem}
                        />
                      );
                    })}
                  </div>
                </section>
              )}

              {/* ============================================================== */}
              {/* 2. LISTA RESTRITA DE TAREFAS PRIORITÁRIAS POR NEGÓCIO */}
              {/* ============================================================== */}
              {todayByArea.length > 0 ? (
                <div className="space-y-6">
                  {todayByArea.map(({ area, items: areaItems }) => (
                    <section key={area.id} className="space-y-2.5">
                      {/* Header do Negócio / Frente com sua cor oficial */}
                      <div className="flex items-center gap-2 px-1">
                        <span
                          className="h-3 w-3 rounded-full shadow-sm"
                          style={{ backgroundColor: area.color }}
                        />
                        <h3
                          className="text-xs sm:text-sm font-bold uppercase tracking-wider"
                          style={{ color: area.color }}
                        >
                          {area.name}
                        </h3>
                        <span className="text-xs font-medium text-neutral-400 ml-1">
                          ({areaItems.length})
                        </span>
                      </div>

                      {/* Cards com atalhos de 1 clique no hover/teclado */}
                      <div className="grid gap-2">
                        {areaItems.map((item) => (
                          <TaskCard
                            key={item.id}
                            item={item}
                            area={area}
                            onToggleStatus={handleToggleStatus}
                            onPostpone={handlePostpone}
                            onPostponeToWeekend={handlePostponeToWeekend}
                            onMoveToInbox={handleMoveToInbox}
                            onEdit={(it) => setEditingItem(it)}
                            onDelete={handleDeleteItem}
                          />
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              ) : todayTimedItems.length === 0 && completedToday.length === 0 ? (
                /* Estado Vazio Acolhedor */
                <div className="rounded-2xl border border-dashed border-border/80 p-8 sm:p-12 text-center bg-surface/30">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-3">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <h3 className="text-base font-semibold text-white">
                    Tudo limpo por hoje!
                  </h3>
                  <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1">
                    Nenhum compromisso ou pendência acumulada no Hoje. Use o atalho ⌘K para capturar qualquer tarefa.
                  </p>
                </div>
              ) : null}

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
                            onPostponeToWeekend={handlePostponeToWeekend}
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

          {/* ============================================================== */}
          {/* TELA CAIXA DE ENTRADA */}
          {/* ============================================================== */}
          {currentTab === 'inbox' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
                    <span>Caixa de Entrada</span>
                    {inboxItems.length > 0 && inboxItems.length <= 20 ? (
                      <span className="rounded-full bg-cyan-500/20 px-2.5 py-0.5 text-xs font-bold text-cyan-300 border border-cyan-500/30">
                        {inboxItems.length} {inboxItems.length === 1 ? 'item' : 'itens'}
                      </span>
                    ) : inboxItems.length > 20 ? (
                      <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-medium text-gray-400 border border-border" title="Contador oculto para evitar ansiedade (+20 itens)">
                        Itens para triar
                      </span>
                    ) : null}
                  </h2>
                  <p className="text-xs text-neutral-400 mt-1">
                    Tudo capturado sem prazo, negócio ou categoria cai aqui para triagem sem atrito.
                  </p>
                </div>

                <button
                  onClick={() => setIsQuickCaptureOpen(true)}
                  className="flex items-center gap-1.5 self-start sm:self-auto rounded-xl bg-amber-400 hover:bg-amber-300 px-3.5 py-2 text-xs font-medium text-neutral-950 shadow-sm transition-colors active:scale-95"
                >
                  <Plus className="h-4 w-4 stroke-[2.5]" />
                  <span>Capturar Novo</span>
                </button>
              </div>

              {/* Guia de Atalhos 100% Teclado */}
              <div className="rounded-xl border border-border/80 bg-surface/60 p-3 shadow-sm">
                <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                  <span className="font-medium text-neutral-300 flex items-center gap-1.5">
                    <Keyboard className="h-4 w-4 text-neutral-400" />
                    Triagem pelo teclado:
                  </span>

                  <div className="flex items-center gap-3 flex-wrap text-neutral-300">
                    <div className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 rounded bg-card border border-border font-mono text-xs text-neutral-200">
                        J
                      </kbd>
                      <span>/</span>
                      <kbd className="px-1.5 py-0.5 rounded bg-card border border-border font-mono text-xs text-neutral-200">
                        K
                      </kbd>
                      <span className="text-neutral-400">navega</span>
                    </div>

                    <span className="text-gray-600">•</span>

                    <div className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 font-mono text-xs text-amber-300 font-medium">
                        Tab
                      </kbd>
                      <span className="text-neutral-300 font-medium">Fazer Hoje</span>
                    </div>

                    <span className="text-neutral-600">•</span>

                    <div className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 font-mono text-xs text-emerald-300 font-medium">
                        D
                      </kbd>
                      <span className="text-neutral-300 font-medium">Arquivar / Feito</span>
                    </div>

                    <span className="text-neutral-600">•</span>

                    <div className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 rounded bg-surface border border-neutral-700 font-mono text-xs text-neutral-200 font-medium">
                        Enter
                      </kbd>
                      <span className="text-neutral-300 font-medium">Contextualizar</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lista da Caixa de Entrada */}
              {inboxItems.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/80 p-8 sm:p-14 text-center bg-surface/30">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 mb-3">
                    <Sparkles className="h-7 w-7" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    Caixa de Entrada Zerada!
                  </h3>
                  <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1">
                    Nenhuma anotação pendente de triagem. Tudo organizado e sem peso na cabeça.
                  </p>
                </div>
              ) : (
                <div className="grid gap-2.5">
                  {inboxItems.map((item, idx) => {
                    const area = areas.find((a) => a.id === item.area_id) || null;
                    const isSelected = idx === selectedIndex;

                    return (
                      <InboxItemCard
                        key={item.id}
                        item={item}
                        area={area}
                        isSelected={isSelected}
                        onSelect={() => setSelectedIndex(idx)}
                        onMoveToToday={handleMoveToToday}
                        onComplete={handleArchiveOrComplete}
                        onOpenContextModal={(it) => setContextualizingItem(it)}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* PAINEL OPERACIONAL: COLUNAS POR NEGÓCIO / SEMANA */}
          {/* ============================================================== */}
          {currentTab === 'board' && (
            <OperationalBoard
              areas={areas}
              items={items}
              onToggleStatus={handleToggleStatus}
              onOpenQuickCapture={(slug) => openQuickCaptureWithPrefill(slug)}
              onEditItem={(item) => setEditingItem(item)}
            />
          )}

          {/* ============================================================== */}
          {/* GRADE SEMANAL: BLOCOS DE TEMPO / SOBRECARGA / BURACOS */}
          {/* ============================================================== */}
          {currentTab === 'semana' && (
            <WeeklyGrid
              areas={areas}
              items={items}
              onOpenQuickCapture={(date) => {
                if (date) {
                  setQuickCaptureInitialInput(`${date} `);
                } else {
                  setQuickCaptureInitialInput('');
                }
                setIsQuickCaptureOpen(true);
              }}
              onEditItem={(item) => setEditingItem(item)}
            />
          )}

          {/* ============================================================== */}
          {/* HUB DO NEGÓCIO: PÁGINA DEDICADA COM 3 ABAS POR EMPRESA */}
          {/* ============================================================== */}
          {currentTab === 'hub' && (
            <BusinessHub
              areas={areas}
              items={items}
              selectedAreaId={selectedHubAreaId}
              onSelectArea={setSelectedHubAreaId}
              onToggleStatus={handleToggleStatus}
              onOpenQuickCapture={(slug) => openQuickCaptureWithPrefill(slug)}
              onEditItem={(item) => setEditingItem(item)}
              onPostpone1Day={(id) => handlePostpone(id, 1)}
              onPostponeWeekend={handlePostponeToWeekend}
              onSendToInbox={handleMoveToInbox}
              onCreateNoteOrDecision={handleCreateNoteOrDecision}
              onConvertNoteToTask={handleConvertNoteToTask}
            />
          )}

          {/* ============================================================== */}
          {/* ANOTAÇÕES E IDEIAS (MARKDOWN LEVE + REGISTRO DE DECISÕES) */}
          {/* ============================================================== */}
          {currentTab === 'anotacoes' && (
            <NotesAndDecisionsView
              areas={areas}
              items={items}
              onCreateItem={async (newItemData) => {
                const created = await createItem(newItemData);
                setItems((prev) => [created, ...prev]);
                showToast(
                  newItemData.type === 'decision'
                    ? 'Decisão registrada no mural! 🎯'
                    : 'Anotação salva com sucesso! 📝'
                );
              }}
              onUpdateItem={async (id, updates) => {
                const updated = await updateItem(id, updates);
                if (updated) {
                  setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
                  showToast('Atualizado! ✨');
                }
              }}
              onDeleteItem={async (id) => {
                await deleteItem(id);
                setItems((prev) => prev.filter((i) => i.id !== id));
                showToast('Excluído.');
              }}
              onConvertToTodayTask={handleConvertNoteToTask}
              onOpenGlobalSearch={() => setIsSearchModalOpen(true)}
            />
          )}

          {/* ============================================================== */}
          {/* CONFIGURAÇÕES, BACKUP DIÁRIO AUTOMÁTICO & TRAVA DE SEGURANÇA */}
          {/* ============================================================== */}
          {currentTab === 'configuracoes' && (
            <SettingsAndBackupView
              onDataRestored={async () => {
                await loadData();
                showToast('Base SQLite restaurada com sucesso! 🔄');
              }}
              onOpenCalendarSync={() => setIsCalendarSyncOpen(true)}
            />
          )}
        </main>
      </div>

      {/* Navegação Inferior Mobile (iPhone) */}
      <BottomNav
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        inboxCount={inboxItems.length}
        todayCount={todayItems.filter((i) => i.status === 'pending').length}
        onOpenQuickCapture={() => openQuickCaptureWithPrefill()}
        onOpenSupabaseConfig={() => setIsSupabaseConfigOpen(true)}
        onOpenCalendarSync={() => setIsCalendarSyncOpen(true)}
      />

      {/* Modal de Captura Rápida (⌘K ou FAB) com Bloqueio Inteligente */}
      <QuickCaptureModal
        isOpen={isQuickCaptureOpen}
        onClose={() => {
          setIsQuickCaptureOpen(false);
          setQuickCaptureInitialInput('');
        }}
        onSave={handleQuickCaptureSave}
        areas={areas}
        items={items}
        initialInput={quickCaptureInitialInput}
      />

      {/* Modal de Contextualização Rápida (Acionado por Enter no Inbox) */}
      <QuickContextModal
        isOpen={Boolean(contextualizingItem)}
        item={contextualizingItem}
        areas={areas}
        onClose={() => setContextualizingItem(null)}
        onSave={handleSaveContext}
      />

      {/* Modal de Edição Geral com Bloqueio Inteligente de Choque de Horário */}
      <EditItemModal
        isOpen={Boolean(editingItem)}
        item={editingItem}
        areas={areas}
        existingItems={items}
        onClose={() => setEditingItem(null)}
        onSave={handleSaveEdit}
        onDelete={handleDeleteItem}
      />

      {/* Modal de Configuração do Supabase */}
      <SupabaseConfigModal
        isOpen={isSupabaseConfigOpen}
        onClose={() => setIsSupabaseConfigOpen(false)}
        onConfigSaved={loadData}
      />

      {/* Modal de Sincronização Google & Apple Calendar (SQLite Local) */}
      <CalendarSyncModal
        isOpen={isCalendarSyncOpen}
        onClose={() => setIsCalendarSyncOpen(false)}
        items={items}
        areas={areas}
        isOnline={isOnline}
        onItemsSynced={async (pulledItems) => {
          for (const pItem of pulledItems) {
            await createItem(pItem);
          }
          setItems((prev) => [...pulledItems, ...prev]);
          showToast(`📅 ${pulledItems.length} reunião(ões) do Google sincronizada(s) no Hoje!`);
        }}
      />

      {/* Modal de Busca Global Instantânea (⌘F) */}
      <GlobalSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        items={items}
        areas={areas}
        onSelectItem={(item) => {
          setEditingItem(item);
        }}
        onConvertToToday={handleConvertNoteToTask}
      />
    </div>
  );
}
