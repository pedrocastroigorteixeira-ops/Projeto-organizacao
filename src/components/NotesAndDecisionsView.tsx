'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Area, Item } from '../types';
import { MarkdownViewer } from './MarkdownViewer';
import { formatDate, formatFriendlyDate } from '../lib/parser';
import {
  FileText,
  BrainCircuit,
  Plus,
  Search,
  Tag,
  CheckCircle2,
  Calendar,
  ArrowRight,
  Trash2,
  Edit2,
  Eye,
  PenLine,
  Lightbulb,
  Sparkles,
  Command,
  X,
  Copy,
  Check,
} from 'lucide-react';

interface NotesAndDecisionsViewProps {
  areas: Area[];
  items: Item[];
  onCreateItem: (data: Omit<Item, 'id' | 'created_at' | 'completed_at'>) => Promise<void>;
  onUpdateItem: (id: string, updates: Partial<Item>) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
  onConvertToTodayTask: (item: Item) => Promise<void>;
  onOpenGlobalSearch?: () => void;
}

type ViewTab = 'notes' | 'decisions';

export function NotesAndDecisionsView({
  areas,
  items,
  onCreateItem,
  onUpdateItem,
  onDeleteItem,
  onConvertToTodayTask,
  onOpenGlobalSearch,
}: NotesAndDecisionsViewProps) {
  const [activeTab, setActiveTab] = useState<ViewTab>('notes');
  const [selectedContext, setSelectedContext] = useState<string | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<'write' | 'preview'>('write');

  // Campos do formulário
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formRationale, setFormRationale] = useState(''); // Específico para Registro de Decisões
  const [formAreaId, setFormAreaId] = useState<string | null>(null);
  const [formTags, setFormTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const todayStr = useMemo(() => formatDate(new Date()), []);

  // Atalho ⌘F ou Ctrl+F para focar na busca
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Separa notas e decisões
  const allNotes = useMemo(() => {
    return items.filter((it) => it.type === 'note' && it.status !== 'archived');
  }, [items]);

  const allDecisions = useMemo(() => {
    return items.filter((it) => it.type === 'decision' && it.status !== 'archived');
  }, [items]);

  // Lista única de contextos (@) existentes em todas as notas e decisões
  const availableContexts = useMemo(() => {
    const set = new Set<string>(['@loja', '@investimentos', '@pessoal']);
    for (const it of [...allNotes, ...allDecisions]) {
      if (it.tags) {
        it.tags.forEach((t) => set.add(t));
      }
      // Também busca no título e conteúdo por @tags
      const fullText = `${it.title} ${it.content || ''} ${it.decision_rationale || ''}`;
      const matches = fullText.match(/@[a-zA-Z0-9À-ÿ_-]+/g);
      if (matches) {
        matches.forEach((m) => set.add(m.toLowerCase()));
      }
    }
    return Array.from(set);
  }, [allNotes, allDecisions]);

  // Itens filtrados para a aba ativa com busca instantânea e filtro de contexto
  const filteredItems = useMemo(() => {
    const list = activeTab === 'notes' ? allNotes : allDecisions;
    const query = searchQuery.trim().toLowerCase();

    return list.filter((item) => {
      // Filtro de contexto @
      if (selectedContext !== 'all') {
        const hasTag = item.tags?.includes(selectedContext);
        const inText =
          item.title.toLowerCase().includes(selectedContext) ||
          item.content?.toLowerCase().includes(selectedContext) ||
          item.decision_rationale?.toLowerCase().includes(selectedContext);
        if (!hasTag && !inText) return false;
      }

      // Busca instantânea por qualquer palavra-chave
      if (query) {
        const inTitle = item.title.toLowerCase().includes(query);
        const inContent = item.content?.toLowerCase().includes(query);
        const inRationale = item.decision_rationale?.toLowerCase().includes(query);
        const inArea = areas.find((a) => a.id === item.area_id)?.name.toLowerCase().includes(query);
        const inTags = item.tags?.some((t) => t.toLowerCase().includes(query));
        if (!inTitle && !inContent && !inRationale && !inArea && !inTags) {
          return false;
        }
      }

      return true;
    });
  }, [activeTab, allNotes, allDecisions, selectedContext, searchQuery, areas]);

  const handleToggleTag = (tag: string) => {
    setFormTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleAddCustomTag = () => {
    if (!customTagInput.trim()) return;
    let clean = customTagInput.trim().toLowerCase();
    if (!clean.startsWith('@')) clean = `@${clean}`;
    if (!formTags.includes(clean)) {
      setFormTags([...formTags, clean]);
    }
    setCustomTagInput('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || isSaving) return;

    try {
      setIsSaving(true);
      await onCreateItem({
        title: formTitle.trim(),
        content: formContent.trim() || undefined,
        decision_rationale:
          activeTab === 'decisions' && formRationale.trim()
            ? formRationale.trim()
            : undefined,
        type: activeTab === 'notes' ? 'note' : 'decision',
        area_id: formAreaId,
        tags: formTags,
        priority: 'normal',
        effort: null,
        scheduled_date: activeTab === 'decisions' ? todayStr : null,
        scheduled_time: null,
        recurrence: null,
        status: 'pending',
      });

      // Limpa formulário
      setFormTitle('');
      setFormContent('');
      setFormRationale('');
      setFormTags([]);
      setIsEditorOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyMarkdown = (item: Item) => {
    const text = `# ${item.title}\n\n${item.content || ''}${
      item.decision_rationale ? `\n\n> **Racional da Decisão:**\n> ${item.decision_rationale}` : ''
    }`;
    navigator.clipboard.writeText(text);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* 1. CABEÇALHO & SELETOR DE ABAS PRINCIPAIS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/70 pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <span>Anotações e Ideias</span>
            <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-semibold text-gray-400 border border-border">
              Repositório Local
            </span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Repositório ultrarrápido em Markdown leve, vinculado a contextos (@loja, @investimentos, @pessoal).
          </p>
        </div>

        {/* Alternador das 2 Abas: Anotações vs Registro de Decisões */}
        <div className="flex items-center gap-1.5 rounded-xl bg-surface p-1 border border-border shrink-0">
          <button
            onClick={() => {
              setActiveTab('notes');
              setIsEditorOpen(false);
            }}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              activeTab === 'notes'
                ? 'bg-card text-white shadow-sm border border-border'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <FileText className="h-4 w-4 text-cyan-400" />
            <span>Anotações & Ideias</span>
            <span className="rounded-full bg-cyan-500/20 px-1.5 py-0.2 text-[10px] font-bold text-cyan-300">
              {allNotes.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab('decisions');
              setIsEditorOpen(false);
            }}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              activeTab === 'decisions'
                ? 'bg-card text-white shadow-sm border border-border'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <BrainCircuit className="h-4 w-4 text-amber-400" />
            <span>Registro de Decisões</span>
            <span className="rounded-full bg-amber-500/20 px-1.5 py-0.2 text-[10px] font-bold text-amber-300">
              {allDecisions.length}
            </span>
          </button>
        </div>
      </div>

      {/* 2. BARRA DE BUSCA INSTANTÂNEA (⌘F) E BOTÃO DE CRIAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Campo de Busca em Tempo Real */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === 'notes'
                ? 'Buscar anotação ou ideia por palavra-chave... (⌘F)'
                : 'Buscar decisão tomada ou motivo... (⌘F)'
            }
            className="w-full rounded-xl border border-border bg-[#121217] pl-10 pr-16 py-2.5 text-xs sm:text-sm text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 shadow-sm"
          />
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded bg-surface px-1.5 py-0.5 text-[10px] font-mono text-gray-400 border border-border hidden sm:inline-block">
              ⌘F
            </span>
          )}
        </div>

        {/* Botão de Nova Entrada */}
        <button
          onClick={() => setIsEditorOpen(!isEditorOpen)}
          className="flex items-center justify-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 px-4 py-2 text-xs font-medium shadow-sm transition-colors active:scale-95 shrink-0"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          <span>
            {activeTab === 'notes' ? 'Nova Anotação / Ideia' : 'Registrar Nova Decisão'}
          </span>
        </button>
      </div>

      {/* 3. FILTRO RÁPIDO DE CONTEXTOS (@loja, @investimentos, @pessoal) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
          <Tag className="h-3 w-3" />
          Contexto:
        </span>

        <button
          onClick={() => setSelectedContext('all')}
          className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all shrink-0 border ${
            selectedContext === 'all'
              ? 'bg-card text-white border-border shadow-sm'
              : 'bg-surface/50 text-gray-400 hover:text-gray-200 border-border/50'
          }`}
        >
          Todos os Contextos
        </button>

        {availableContexts.map((ctx) => {
          const isSelected = selectedContext === ctx;
          return (
            <button
              key={ctx}
              onClick={() => setSelectedContext(isSelected ? 'all' : ctx)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all shrink-0 border flex items-center gap-1 ${
                isSelected
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm'
                  : 'bg-surface/50 text-gray-400 hover:text-gray-200 border-border/50'
              }`}
            >
              <span>{ctx}</span>
            </button>
          );
        })}
      </div>

      {/* 4. FORMULÁRIO DE CRIAÇÃO RÁPIDA (MARKDOWN LEVE) */}
      {isEditorOpen && (
        <form
          onSubmit={handleSave}
          className="rounded-2xl border border-cyan-500/30 bg-[#121217] p-5 shadow-xl space-y-4 animate-in fade-in slide-in-from-top-2"
        >
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-2">
              {activeTab === 'notes' ? (
                <>
                  <FileText className="h-4 w-4" />
                  <span>Escrever Nova Anotação em Markdown</span>
                </>
              ) : (
                <>
                  <BrainCircuit className="h-4 w-4 text-amber-400" />
                  <span>Registrar Decisão Estratégica do Dia</span>
                </>
              )}
            </span>

            {/* Alternador Escrever / Preview */}
            <div className="flex items-center gap-1 bg-surface p-0.5 rounded-lg border border-border text-[11px]">
              <button
                type="button"
                onClick={() => setEditorMode('write')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded font-semibold transition-all ${
                  editorMode === 'write'
                    ? 'bg-card text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <PenLine className="h-3 w-3" />
                <span>Escrever</span>
              </button>
              <button
                type="button"
                onClick={() => setEditorMode('preview')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded font-semibold transition-all ${
                  editorMode === 'preview'
                    ? 'bg-card text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <Eye className="h-3 w-3" />
                <span>Visualizar</span>
              </button>
            </div>
          </div>

          {/* Título */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              {activeTab === 'notes' ? 'Título da Anotação / Ideia:' : 'O que foi decidido?'}
            </label>
            <input
              type="text"
              required
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder={
                activeTab === 'notes'
                  ? 'Ex: Ideias para reformulação do cardápio de combos @loja'
                  : 'Ex: Mudança de fornecedor de caixas térmicas por causa de atraso @loja'
              }
              className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          {/* Racional Específico da Decisão (O Porquê) */}
          {activeTab === 'decisions' && (
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-amber-300 flex items-center justify-between">
                <span>Racional da Decisão (Por que decidimos isso?):</span>
                <span className="text-[10px] text-gray-500 font-normal">
                  Evita esquecer o motivo semanas depois
                </span>
              </label>
              <textarea
                rows={2}
                value={formRationale}
                onChange={(e) => setFormRationale(e.target.value)}
                placeholder="Ex: O fornecedor antigo atrasou 3 entregas cruciais em novembro gerando falta de embalagens. O novo cobra 4% a mais mas entrega em 24h garantidas."
                className="w-full rounded-xl border border-amber-500/30 bg-surface px-3.5 py-2 text-xs sm:text-sm text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none"
              />
            </div>
          )}

          {/* Corpo em Markdown Leve */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 flex items-center justify-between">
              <span>Conteúdo em Markdown leve:</span>
              <span className="text-[10px] text-gray-500 font-normal">
                Suporta # títulos, - listas, **negrito**, `código` e @contextos
              </span>
            </label>

            {editorMode === 'write' ? (
              <textarea
                rows={5}
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                placeholder={
                  activeTab === 'notes'
                    ? '# Ponto 1\n- Detalhe importante com **destaque**\n- Link com @loja ou @investimentos\n> Citação ou reflexão'
                    : 'Detalhes adicionais, termos acordados, prazos de transição...'
                }
                className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-xs sm:text-sm font-mono text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
              />
            ) : (
              <div className="min-h-[120px] rounded-xl border border-border bg-surface/50 p-4">
                {formContent ? (
                  <MarkdownViewer content={formContent} />
                ) : (
                  <span className="text-xs text-gray-500 italic">Nada para pré-visualizar.</span>
                )}
              </div>
            )}
          </div>

          {/* Vinculação de Contextos (@) e Frente */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/60">
            {/* Contextos @ */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Contexto associado (@):
              </label>
              <div className="flex flex-wrap gap-1.5">
                {['@loja', '@investimentos', '@pessoal', '@equipe'].map((tag) => {
                  const isChecked = formTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleToggleTag(tag)}
                      className={`rounded-lg px-2 py-0.5 text-xs font-semibold border transition-all ${
                        isChecked
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                          : 'bg-surface text-gray-400 border-border hover:text-gray-200'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-1.5 mt-1.5">
                <input
                  type="text"
                  value={customTagInput}
                  onChange={(e) => setCustomTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomTag();
                    }
                  }}
                  placeholder="Novo @contexto..."
                  className="rounded-lg bg-surface border border-border px-2.5 py-1 text-xs text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddCustomTag}
                  className="rounded-lg bg-surface hover:bg-surface-hover px-2.5 py-1 text-xs text-gray-300 border border-border"
                >
                  + Add
                </button>
              </div>
            </div>

            {/* Frente do Negócio */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Frente / Negócio:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {areas.map((a) => {
                  const isSelected = formAreaId === a.id;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setFormAreaId(isSelected ? null : a.id)}
                      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium border transition-all ${
                        isSelected
                          ? 'border-white/40 bg-card text-white shadow-sm'
                          : 'border-border bg-surface text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: a.color }}
                      />
                      <span>{a.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Botões do Formulário */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
            <button
              type="button"
              onClick={() => setIsEditorOpen(false)}
              className="rounded-xl px-4 py-2 text-xs font-medium text-gray-400 hover:text-white"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={!formTitle.trim() || isSaving}
              className="rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 px-5 py-2 text-xs font-medium shadow-sm transition-colors active:scale-95 disabled:opacity-50"
            >
              {isSaving
                ? 'Salvando...'
                : activeTab === 'notes'
                ? 'Salvar Anotação'
                : 'Salvar Decisão'}
            </button>
          </div>
        </form>
      )}

      {/* 5. LISTA DE ANOTAÇÕES OU DECISÕES */}
      {filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/80 bg-surface/20 p-12 text-center">
          {activeTab === 'notes' ? (
            <>
              <Lightbulb className="mx-auto h-8 w-8 text-amber-400/60 mb-2" />
              <p className="text-sm font-medium text-gray-300">
                {searchQuery || selectedContext !== 'all'
                  ? 'Nenhuma anotação encontrada com os filtros atuais.'
                  : 'Nenhuma anotação registrada ainda.'}
              </p>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                Use anotações para registrar ideias, links, rascunhos de processos e aprendizados.
              </p>
            </>
          ) : (
            <>
              <BrainCircuit className="mx-auto h-8 w-8 text-amber-400/60 mb-2" />
              <p className="text-sm font-medium text-gray-300">
                {searchQuery || selectedContext !== 'all'
                  ? 'Nenhuma decisão encontrada com os filtros atuais.'
                  : 'Nenhuma decisão registrada ainda no dia.'}
              </p>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                Guarde decisões importantes e seu racional para nunca esquecer o motivo semanas depois.
              </p>
            </>
          )}

          <button
            onClick={() => setIsEditorOpen(true)}
            className="mt-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 px-4 py-2 text-xs font-medium shadow-sm transition-colors"
          >
            + Começar agora
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredItems.map((item) => {
            const area = areas.find((a) => a.id === item.area_id) || null;
            const isDecision = item.type === 'decision';

            return (
              <div
                key={item.id}
                className="group rounded-2xl border border-border bg-[#121217] p-4 sm:p-5 hover:bg-[#15151C] hover:border-border-focus transition-all shadow-sm flex flex-col justify-between space-y-3.5"
                style={{
                  borderLeftWidth: area ? '4px' : '3px',
                  borderLeftColor: area ? area.color : isDecision ? '#F59E0B' : '#06B6D4',
                }}
              >
                <div className="space-y-3">
                  {/* Topo do Card: Tipo, Data e Contexto */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border ${
                          isDecision
                            ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                        }`}
                      >
                        {isDecision ? (
                          <>
                            <BrainCircuit className="h-3 w-3 text-amber-400" />
                            <span>Decisão Tomada</span>
                          </>
                        ) : (
                          <>
                            <FileText className="h-3 w-3 text-cyan-400" />
                            <span>Anotação</span>
                          </>
                        )}
                      </span>

                      {/* Frente associada */}
                      {area && (
                        <span
                          className="text-[10px] font-semibold px-2 py-0.5 rounded border"
                          style={{
                            backgroundColor: `${area.color}15`,
                            color: area.color,
                            borderColor: `${area.color}35`,
                          }}
                        >
                          {area.name}
                        </span>
                      )}

                      {/* Tags de Contexto (@loja, etc.) */}
                      {item.tags?.map((t) => (
                        <span
                          key={t}
                          className="text-[10px] font-bold text-cyan-300 bg-cyan-500/10 px-1.5 py-0.2 rounded border border-cyan-500/20"
                        >
                          {t}
                        </span>
                      ))}
                    </div>

                    <span className="text-[11px] text-gray-500">
                      {new Date(item.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>

                  {/* Título Principal */}
                  <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-amber-300 transition-colors leading-snug">
                    {item.title}
                  </h3>

                  {/* Racional da Decisão (Destaque para não esquecer o motivo) */}
                  {item.decision_rationale && (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-amber-400" />
                        <span>Racional & Motivo:</span>
                      </span>
                      <p className="text-xs text-gray-300 italic leading-relaxed">
                        &quot;{item.decision_rationale}&quot;
                      </p>
                    </div>
                  )}

                  {/* Conteúdo em Markdown */}
                  {item.content && (
                    <div className="pt-1">
                      <MarkdownViewer content={item.content} />
                    </div>
                  )}
                </div>

                {/* Rodapé de Ações */}
                <div className="pt-3 border-t border-border/50 flex items-center justify-between gap-2 flex-wrap text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onConvertToTodayTask(item)}
                      className="flex items-center gap-1.5 rounded-lg bg-surface hover:bg-surface-hover px-2.5 py-1 text-[11px] font-semibold text-gray-300 hover:text-white border border-border transition-colors"
                      title="Transformar em tarefa para Fazer Hoje"
                    >
                      <ArrowRight className="h-3 w-3 text-amber-400" />
                      <span>Fazer Hoje</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopyMarkdown(item)}
                      className="flex items-center gap-1 rounded-lg bg-surface hover:bg-surface-hover px-2 py-1 text-[11px] font-medium text-gray-400 hover:text-gray-200 border border-border transition-colors"
                      title="Copiar em Markdown"
                    >
                      {copiedId === item.id ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-400" />
                          <span className="text-emerald-400">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Deseja excluir esta anotação/decisão?')) {
                        onDeleteItem(item.id);
                      }
                    }}
                    className="rounded p-1 text-gray-500 hover:text-red-400 transition-colors"
                    title="Excluir anotação"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
