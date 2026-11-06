'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Area, Item, Subtask, EnergyLevel } from '../types';
import { ENERGY_LEVELS } from '../lib/constants';
import { playSatisfyingClick } from '../lib/sound';
import confetti from 'canvas-confetti';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Check,
  CheckCircle2,
  Zap,
  Clock,
  Sparkles,
  Layers,
  Flame,
  ArrowRight,
  Maximize2,
  Minimize2,
  Trash2,
} from 'lucide-react';

interface HyperfocusModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Item[];
  areas: Area[];
  initialTaskId?: string | null;
  onUpdateTask: (id: string, updates: Partial<Item>) => Promise<void>;
  onCompleteTask: (id: string) => Promise<void>;
}

export function HyperfocusModal({
  isOpen,
  onClose,
  tasks,
  areas,
  initialTaskId,
  onUpdateTask,
  onCompleteTask,
}: HyperfocusModalProps) {
  // Filtro de energia do usuário no momento
  const [energyFilter, setEnergyFilter] = useState<'all' | EnergyLevel>('all');

  // Tarefas elegíveis para foco (pendentes)
  const pendingTasks = useMemo(() => {
    return tasks.filter((t) => t.status === 'pending');
  }, [tasks]);

  // Fila filtrada por energia (se selecionada)
  const filteredQueue = useMemo(() => {
    if (energyFilter === 'all') return pendingTasks;
    return pendingTasks.filter((t) => t.energy_level === energyFilter);
  }, [pendingTasks, energyFilter]);

  // Tarefa atualmente ativa em hiperfoco
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialTaskId && pendingTasks.some((t) => t.id === initialTaskId)) {
        setActiveTaskId(initialTaskId);
      } else if (filteredQueue.length > 0) {
        setActiveTaskId(filteredQueue[0].id);
      } else if (pendingTasks.length > 0) {
        setActiveTaskId(pendingTasks[0].id);
      }
    }
  }, [isOpen, initialTaskId, pendingTasks, filteredQueue]);

  const activeTask = useMemo(() => {
    return pendingTasks.find((t) => t.id === activeTaskId) || null;
  }, [pendingTasks, activeTaskId]);

  const activeArea = useMemo(() => {
    if (!activeTask || !activeTask.area_id) return null;
    return areas.find((a) => a.id === activeTask.area_id) || null;
  }, [activeTask, areas]);

  // ==============================================================
  // CRONÔMETRO VISUAL (POMODORO / TIMEBOX)
  // Ampulheta visual contínua sem som estridente
  // ==============================================================
  const [timeboxMinutes, setTimeboxMinutes] = useState<number>(25);
  const [secondsLeft, setSecondsLeft] = useState<number>(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  // Reinicia o cronômetro ao mudar o timebox
  const setPresetTimebox = (minutes: number) => {
    setTimeboxMinutes(minutes);
    setSecondsLeft(minutes * 60);
    setIsTimerRunning(false);
  };

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            playSatisfyingClick();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, secondsLeft]);

  const timerProgress = useMemo(() => {
    const total = timeboxMinutes * 60;
    return Math.max(0, Math.min(100, ((total - secondsLeft) / total) * 100));
  }, [secondsLeft, timeboxMinutes]);

  const formattedTimer = useMemo(() => {
    const m = Math.floor(secondsLeft / 60);
    const s = secondsLeft % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, [secondsLeft]);

  // ==============================================================
  // MICRO-ETAPAS DA TAREFA
  // ==============================================================
  const [newStepText, setNewStepText] = useState('');
  const newStepInputRef = useRef<HTMLInputElement>(null);

  const subtasks = useMemo(() => {
    return activeTask?.subtasks || [];
  }, [activeTask]);

  const completedSubtasksCount = useMemo(() => {
    return subtasks.filter((st) => st.completed).length;
  }, [subtasks]);

  const subtasksProgress = useMemo(() => {
    if (subtasks.length === 0) return 0;
    return Math.round((completedSubtasksCount / subtasks.length) * 100);
  }, [subtasks, completedSubtasksCount]);

  const handleToggleSubtask = async (subtaskId: string) => {
    if (!activeTask) return;
    const currentList = activeTask.subtasks || [];
    const target = currentList.find((st) => st.id === subtaskId);
    const willBeCompleted = target ? !target.completed : true;

    if (willBeCompleted) {
      playSatisfyingClick();
      try {
        confetti({
          particleCount: 18,
          spread: 45,
          origin: { y: 0.6 },
          colors: activeArea ? [activeArea.color, '#10B981'] : ['#10B981', '#F59E0B'],
          disableForReducedMotion: true,
        });
      } catch {}
    }

    const updated = currentList.map((st) =>
      st.id === subtaskId ? { ...st, completed: willBeCompleted } : st
    );

    await onUpdateTask(activeTask.id, { subtasks: updated });
  };

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTask || !newStepText.trim()) return;

    const newSubtask: Subtask = {
      id: `st-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: newStepText.trim(),
      completed: false,
    };

    const updated = [...(activeTask.subtasks || []), newSubtask];
    setNewStepText('');
    await onUpdateTask(activeTask.id, { subtasks: updated });
    newStepInputRef.current?.focus();
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    if (!activeTask) return;
    const updated = (activeTask.subtasks || []).filter((st) => st.id !== subtaskId);
    await onUpdateTask(activeTask.id, { subtasks: updated });
  };

  // Alterar nível de energia da tarefa ativa
  const handleChangeEnergy = async (energy: EnergyLevel) => {
    if (!activeTask) return;
    await onUpdateTask(activeTask.id, { energy_level: energy });
  };

  // ==============================================================
  // CONCLUSÃO DA TAREFA COM MICRO-RECOMPENSA
  // ==============================================================
  const handleCompleteActiveTask = async () => {
    if (!activeTask) return;

    playSatisfyingClick();
    try {
      confetti({
        particleCount: 80,
        spread: 80,
        origin: { y: 0.5 },
        colors: activeArea ? [activeArea.color, '#F59E0B', '#10B981', '#38BDF8'] : ['#F59E0B', '#10B981', '#38BDF8'],
      });
    } catch {}

    const taskId = activeTask.id;
    await onCompleteTask(taskId);

    // Avança para a próxima tarefa na fila
    const remaining = pendingTasks.filter((t) => t.id !== taskId);
    if (remaining.length > 0) {
      setActiveTaskId(remaining[0].id);
      // Reset timer para o próximo ciclo
      setSecondsLeft(timeboxMinutes * 60);
      setIsTimerRunning(false);
    } else {
      setActiveTaskId(null);
    }
  };

  // Atalho global Esc para fechar o modo foco
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0A0A0E] text-gray-100 overflow-y-auto selection:bg-amber-500/30 selection:text-amber-200">
      {/* ============================================================== */}
      {/* CABEÇALHO LIMPO SEM DISTRAÇÕES */}
      {/* ============================================================== */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border/60 bg-[#0A0A0E]/90 px-4 sm:px-8 py-3.5 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-black shadow-md shadow-amber-500/20">
            <Flame className="h-4 w-4 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold tracking-tight text-white uppercase">
                Modo Hiperfoco
              </span>
              <span className="rounded-full bg-surface px-2 py-0.2 text-[10px] font-mono text-gray-400 border border-border">
                1 coisa por vez
              </span>
            </div>
            <p className="text-[11px] text-gray-400 hidden sm:block">
              Interface silenciosa contra paralisia por sobrecarga
            </p>
          </div>
        </div>

        {/* Nível de Ativação / Disposição Mental do Momento */}
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="hidden sm:flex items-center gap-1 text-[11px] text-gray-400 mr-2">
            <Zap className="h-3.5 w-3.5 text-amber-400" />
            <span>Disposição agora:</span>
          </div>

          <div className="flex items-center gap-1 rounded-xl bg-surface p-1 border border-border">
            <button
              onClick={() => setEnergyFilter('all')}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                energyFilter === 'all'
                  ? 'bg-card text-white shadow-sm border border-border'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setEnergyFilter('low')}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all flex items-center gap-1 ${
                energyFilter === 'low'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-gray-400 hover:text-emerald-300'
              }`}
              title="Baixo foco / Tarefas leves"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>Leve</span>
            </button>
            <button
              onClick={() => setEnergyFilter('medium')}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all flex items-center gap-1 ${
                energyFilter === 'medium'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-gray-400 hover:text-amber-300'
              }`}
              title="Médio foco / Tarefas normais"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              <span>Normal</span>
            </button>
            <button
              onClick={() => setEnergyFilter('high')}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all flex items-center gap-1 ${
                energyFilter === 'high'
                  ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                  : 'text-gray-400 hover:text-red-300'
              }`}
              title="Alto foco / Tarefas pesadas"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
              <span>Profundo</span>
            </button>
          </div>

          {/* Botão de Fechar / Sair */}
          <button
            onClick={onClose}
            title="Sair do modo hiperfoco (Esc)"
            className="ml-2 flex items-center gap-1 rounded-xl bg-surface hover:bg-surface-hover text-gray-300 hover:text-white px-3 py-1.5 text-xs font-semibold border border-border transition-colors active:scale-95"
          >
            <span>Sair</span>
            <kbd className="hidden sm:inline-block ml-1 rounded bg-black/40 px-1 text-[10px] text-gray-400 font-mono">
              Esc
            </kbd>
          </button>
        </div>
      </header>

      {/* ============================================================== */}
      {/* CORPO DO HIPERFOCO: APENAS 1 TAREFA NA TELA */}
      {/* ============================================================== */}
      <main className="flex-1 mx-auto w-full max-w-3xl px-4 sm:px-8 py-6 sm:py-10 flex flex-col justify-between">
        {activeTask ? (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* 1. CRONÔMETRO VISUAL (Ampulheta / Timebox) */}
            <div className="rounded-3xl border border-border/80 bg-[#121217] p-5 sm:p-6 shadow-xl">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-5">
                {/* Visualizador de Ampulheta / Relógio */}
                <div className="flex items-center gap-5">
                  <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
                    {/* Anel de progresso em SVG */}
                    <svg className="h-20 w-20 -rotate-90 transform" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="42"
                        className="stroke-[#22222E]"
                        strokeWidth="8"
                        fill="transparent"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="42"
                        className="stroke-amber-400 transition-all duration-1000"
                        strokeWidth="8"
                        fill="transparent"
                        strokeDasharray={264}
                        strokeDashoffset={264 - (264 * timerProgress) / 100}
                        strokeLinecap="round"
                      />
                    </svg>
                    {/* Contador Central */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <Clock className="h-4 w-4 text-amber-400/80 mb-0.5" />
                      <span className="font-mono text-sm font-bold text-white tracking-tight">
                        {formattedTimer}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white">
                        Timebox Visual
                      </h3>
                      <span className="rounded-full bg-amber-500/10 px-2 py-0.2 text-[10px] font-semibold text-amber-300 border border-amber-500/20">
                        {isTimerRunning ? 'Foco Ativo' : 'Pausado'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Contagem regressiva suave sem alarmes estridentes.
                    </p>

                    {/* Presets de minutos */}
                    <div className="flex items-center gap-1.5 mt-2.5">
                      {[15, 25, 45].map((mins) => (
                        <button
                          key={mins}
                          onClick={() => setPresetTimebox(mins)}
                          className={`rounded-lg px-2.5 py-1 text-xs font-semibold border transition-all ${
                            timeboxMinutes === mins
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-surface text-gray-400 border-border hover:text-gray-200'
                          }`}
                        >
                          {mins}m
                        </button>
                      ))}
                      <button
                        onClick={() => setSecondsLeft((prev) => prev + 300)}
                        title="Adicionar +5 minutos"
                        className="rounded-lg bg-surface hover:bg-surface-hover text-gray-300 px-2 py-1 text-xs font-semibold border border-border"
                      >
                        +5m
                      </button>
                    </div>
                  </div>
                </div>

                {/* Controles do Cronômetro */}
                <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
                  <button
                    onClick={() => setIsTimerRunning(!isTimerRunning)}
                    className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-xs font-bold text-black shadow-md transition-all active:scale-95 ${
                      isTimerRunning
                        ? 'bg-amber-400 hover:bg-amber-300'
                        : 'bg-emerald-400 hover:bg-emerald-300'
                    }`}
                  >
                    {isTimerRunning ? (
                      <>
                        <Pause className="h-4 w-4" />
                        <span>Pausar</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 fill-black" />
                        <span>Iniciar Foco</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setIsTimerRunning(false);
                      setSecondsLeft(timeboxMinutes * 60);
                    }}
                    title="Reiniciar tempo"
                    className="flex items-center justify-center rounded-2xl bg-surface hover:bg-surface-hover p-3 text-gray-400 hover:text-white border border-border"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* 2. CARD GIGANTE DA TAREFA ÚNICA */}
            <div className="rounded-3xl border border-border bg-[#141419] p-6 sm:p-8 shadow-2xl space-y-6">
              {/* Badges do Negócio e Nível de Foco */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Frente / Negócio */}
                  {activeArea && (
                    <span
                      className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-xl border shadow-sm"
                      style={{
                        backgroundColor: `${activeArea.color}20`,
                        color: activeArea.color,
                        borderColor: `${activeArea.color}40`,
                      }}
                    >
                      {activeArea.name}
                    </span>
                  )}

                  {/* Prioridade */}
                  {activeTask.priority === 'high' && (
                    <span className="text-xs font-bold text-red-300 bg-red-500/20 px-2.5 py-1 rounded-xl border border-red-500/40">
                      Urgente (!!)
                    </span>
                  )}

                  {/* Horário */}
                  {activeTask.scheduled_time && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-indigo-300 bg-indigo-500/20 px-2.5 py-1 rounded-xl border border-indigo-500/40">
                      <Clock className="h-3.5 w-3.5" />
                      {activeTask.scheduled_time}
                    </span>
                  )}
                </div>

                {/* Seletor rápido de Nível de Energia da Tarefa */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-gray-400 text-[11px]">Energia:</span>
                  {(['low', 'medium', 'high'] as EnergyLevel[]).map((level) => {
                    const cfg = ENERGY_LEVELS[level];
                    const isSelected = activeTask.energy_level === level;
                    return (
                      <button
                        key={level}
                        type="button"
                        onClick={() => handleChangeEnergy(level)}
                        className={`rounded-lg px-2 py-0.5 text-[11px] font-semibold border transition-all ${
                          isSelected
                            ? cfg.badgeClass
                            : 'bg-surface text-gray-500 border-border hover:text-gray-300'
                        }`}
                        title={cfg.desc}
                      >
                        {cfg.label.replace(' foco', '')}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Título Principal Gigante e Limpo */}
              <h1 className="text-xl sm:text-3xl font-extrabold text-white leading-tight">
                {activeTask.title}
              </h1>

              {/* ============================================================== */}
              {/* MICRO-ETAPAS ANTI-PARALISIA */}
              {/* ============================================================== */}
              <div className="space-y-4 pt-3 border-t border-border/80">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-cyan-400" />
                    <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-gray-200">
                      Micro-passos (para destravar)
                    </h3>
                  </div>

                  {subtasks.length > 0 && (
                    <span className="text-xs font-semibold text-cyan-300 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/30">
                      {completedSubtasksCount} de {subtasks.length} concluídos ({subtasksProgress}%)
                    </span>
                  )}
                </div>

                {/* Barra de Progresso Visual das Micro-etapas */}
                {subtasks.length > 0 && (
                  <div className="h-2 w-full rounded-full bg-[#1C1C26] overflow-hidden border border-border/60">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 via-amber-400 to-emerald-400 transition-all duration-300"
                      style={{ width: `${subtasksProgress}%` }}
                    />
                  </div>
                )}

                {/* Lista de Micro-passos */}
                <div className="space-y-2">
                  {subtasks.map((step, idx) => (
                    <div
                      key={step.id}
                      onClick={() => handleToggleSubtask(step.id)}
                      className={`group flex items-center justify-between gap-3 rounded-2xl border p-3 cursor-pointer transition-all ${
                        step.completed
                          ? 'border-emerald-500/30 bg-[#101914] text-gray-400 opacity-75'
                          : 'border-border bg-surface hover:bg-surface-hover text-gray-100 hover:border-border-focus'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Checkbox circular de micro-passo */}
                        <div
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all ${
                            step.completed
                              ? 'border-emerald-500 bg-emerald-500 text-black shadow-sm'
                              : 'border-gray-500 group-hover:border-emerald-400'
                          }`}
                        >
                          {step.completed && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>

                        <span
                          className={`text-xs sm:text-sm font-medium ${
                            step.completed ? 'line-through text-gray-500' : 'text-gray-100'
                          }`}
                        >
                          {step.title}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSubtask(step.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 p-1 transition-opacity"
                        title="Remover micro-passo"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Formulário para Fatiar Tarefa / Adicionar Próximo Micro-passo */}
                <form onSubmit={handleAddSubtask} className="flex gap-2 pt-1">
                  <input
                    ref={newStepInputRef}
                    type="text"
                    value={newStepText}
                    onChange={(e) => setNewStepText(e.target.value)}
                    placeholder="Adicionar micro-passo curto... (ex: abrir o site, baixar extrato)"
                    className="flex-1 rounded-xl bg-card border border-border px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all"
                  />
                  <button
                    type="submit"
                    disabled={!newStepText.trim()}
                    className="rounded-xl bg-white/10 hover:bg-white/15 px-3.5 py-2 text-xs font-semibold text-white border border-border disabled:opacity-40 transition-all flex items-center gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Adicionar</span>
                  </button>
                </form>
              </div>

              {/* BOTÃO PRINCIPAL DE CONCLUSÃO COM RECOMPENSA */}
              <div className="pt-4 border-t border-border/80 flex items-center justify-between flex-wrap gap-3">
                <button
                  onClick={handleCompleteActiveTask}
                  className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 p-3.5 text-xs sm:text-sm font-extrabold text-black shadow-lg shadow-emerald-500/20 hover:brightness-110 active:scale-95 transition-all"
                >
                  <CheckCircle2 className="h-5 w-5 stroke-[2.5]" />
                  <span>Concluir Tarefa Completa</span>
                </button>
              </div>
            </div>

            {/* ============================================================== */}
            {/* FILA PEQUENA E APAGADA EMBAIXO (PRD Seção 4) */}
            {/* ============================================================== */}
            {filteredQueue.length > 1 && (
              <div className="rounded-2xl border border-border/60 bg-[#101014] p-4 opacity-70 hover:opacity-100 transition-opacity space-y-2.5">
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span className="font-semibold uppercase tracking-wider text-[10px]">
                    Fila de Espera ({filteredQueue.length - 1} tarefas)
                  </span>
                  <span className="text-[11px] text-gray-500">
                    Clique para trocar a tarefa em foco
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {filteredQueue
                    .filter((t) => t.id !== activeTaskId)
                    .slice(0, 4)
                    .map((item) => {
                      const itemArea = areas.find((a) => a.id === item.area_id);
                      return (
                        <button
                          key={item.id}
                          onClick={() => setActiveTaskId(item.id)}
                          className="flex items-center gap-2 rounded-xl bg-surface hover:bg-surface-hover px-3 py-1.5 text-xs font-medium text-gray-300 border border-border transition-all active:scale-95"
                        >
                          {itemArea && (
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: itemArea.color }}
                            />
                          )}
                          <span className="truncate max-w-[200px]">{item.title}</span>
                          <ArrowRight className="h-3 w-3 text-gray-500" />
                        </button>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Estado de Conclusão / Sem tarefas pendentes */
          <div className="my-auto text-center py-16 space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-xl">
              <Sparkles className="h-8 w-8" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              Tudo Concluído em Foco!
            </h2>
            <p className="text-xs sm:text-sm text-gray-400 max-w-md mx-auto">
              Você completou todas as tarefas da fila de hiperfoco. Descanse a mente ou volte para a tela principal.
            </p>
            <button
              onClick={onClose}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-5 py-2.5 text-xs font-bold text-black transition-all active:scale-95 shadow-md"
            >
              <span>Voltar para a tela Hoje</span>
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
