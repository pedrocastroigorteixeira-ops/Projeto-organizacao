'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Area, Item } from '../types';
import { formatFriendlyDate } from '../lib/parser';
import {
  Search,
  X,
  FileText,
  BrainCircuit,
  CheckCircle2,
  Calendar,
  Clock,
  Tag,
  ArrowRight,
  Repeat,
  Sparkles,
} from 'lucide-react';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: Item[];
  areas: Area[];
  onSelectItem: (item: Item) => void;
  onConvertToToday?: (item: Item) => void;
}

type FilterCategory = 'all' | 'notes' | 'decisions' | 'tasks';

export function GlobalSearchModal({
  isOpen,
  onClose,
  items,
  areas,
  onSelectItem,
  onConvertToToday,
}: GlobalSearchModalProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<FilterCategory>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setCategory('all');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Resultados filtrados em tempo real
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // Quando não há busca, mostra os itens mais recentes
      return items.slice(0, 10);
    }

    return items
      .filter((item) => {
        // Filtro por categoria
        if (category === 'notes' && item.type !== 'note') return false;
        if (category === 'decisions' && item.type !== 'decision') return false;
        if (category === 'tasks' && item.type !== 'task') return false;

        // Busca no título, conteúdo, racional, tags e nome da frente
        const inTitle = item.title.toLowerCase().includes(q);
        const inContent = item.content?.toLowerCase().includes(q);
        const inRationale = item.decision_rationale?.toLowerCase().includes(q);
        const inArea = areas.find((a) => a.id === item.area_id)?.name.toLowerCase().includes(q);
        const inTags = item.tags?.some((t) => t.toLowerCase().includes(q));

        return inTitle || inContent || inRationale || inArea || inTags;
      })
      .slice(0, 30);
  }, [items, query, category, areas]);

  // Teclado para navegar nos resultados
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, Math.max(0, results.length - 1)));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'Enter') {
        if (results[selectedIndex]) {
          e.preventDefault();
          onSelectItem(results[selectedIndex]);
          onClose();
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, onClose, onSelectItem]);

  if (!isOpen) return null;

  // Realce de texto encontrado
  const highlightMatch = (text: string) => {
    if (!query.trim() || !text) return text;
    const regex = new RegExp(`(${query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, idx) => {
      if (part.toLowerCase() === query.trim().toLowerCase()) {
        return (
          <mark key={idx} className="bg-amber-400/30 text-amber-200 rounded px-0.5">
            {part}
          </mark>
        );
      }
      return part;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 sm:pt-20">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-[#14141A] shadow-2xl animate-in fade-in zoom-in-95">
        {/* Barra de Busca */}
        <div className="flex items-center gap-3 border-b border-border/80 px-4 py-3 bg-[#181820]">
          <Search className="h-5 w-5 text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Buscar por qualquer palavra-chave em notas, tarefas e decisões... (⌘F)"
            className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="rounded p-1 text-gray-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <span className="rounded bg-surface px-1.5 py-0.5 text-[10px] font-mono text-gray-400 border border-border">
            ESC para fechar
          </span>
        </div>

        {/* Filtros por Tipo de Item */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-border/60 bg-[#121217] text-xs overflow-x-auto scrollbar-none">
          <button
            onClick={() => setCategory('all')}
            className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
              category === 'all'
                ? 'bg-card text-white border border-border'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Tudo ({items.length})
          </button>
          <button
            onClick={() => setCategory('notes')}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 font-semibold transition-all ${
              category === 'notes'
                ? 'bg-card text-cyan-300 border border-border'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <FileText className="h-3 w-3 text-cyan-400" />
            <span>Anotações</span>
          </button>
          <button
            onClick={() => setCategory('decisions')}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 font-semibold transition-all ${
              category === 'decisions'
                ? 'bg-card text-amber-300 border border-border'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <BrainCircuit className="h-3 w-3 text-amber-400" />
            <span>Decisões</span>
          </button>
          <button
            onClick={() => setCategory('tasks')}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 font-semibold transition-all ${
              category === 'tasks'
                ? 'bg-card text-emerald-300 border border-border'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
            <span>Tarefas & Rituais</span>
          </button>
        </div>

        {/* Lista de Resultados */}
        <div className="max-h-[60vh] overflow-y-auto p-2 space-y-1">
          {results.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-500">
              Nenhum resultado encontrado para &quot;{query}&quot;.
            </div>
          ) : (
            results.map((item, idx) => {
              const area = areas.find((a) => a.id === item.area_id) || null;
              const isSelected = selectedIndex === idx;
              const isDecision = item.type === 'decision';
              const isNote = item.type === 'note';

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    onSelectItem(item);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`group rounded-xl p-3 text-xs transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-card border-cyan-500/50 shadow-sm'
                      : 'border-transparent hover:bg-surface/60 text-gray-300'
                  }`}
                  style={{
                    borderLeftWidth: '3px',
                    borderLeftColor: area ? area.color : isDecision ? '#F59E0B' : '#06B6D4',
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 flex-1 min-w-0">
                      {/* Tags do Item */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {isDecision ? (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-500/15 px-1.5 py-0.2 rounded border border-amber-500/30">
                            <BrainCircuit className="h-2.5 w-2.5" />
                            Decisão
                          </span>
                        ) : isNote ? (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-cyan-300 bg-cyan-500/15 px-1.5 py-0.2 rounded border border-cyan-500/30">
                            <FileText className="h-2.5 w-2.5" />
                            Anotação
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-500/15 px-1.5 py-0.2 rounded border border-emerald-500/30">
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            Tarefa
                          </span>
                        )}

                        {area && (
                          <span
                            className="text-[10px] font-semibold px-1.5 py-0.2 rounded"
                            style={{
                              backgroundColor: `${area.color}15`,
                              color: area.color,
                            }}
                          >
                            {area.name}
                          </span>
                        )}

                        {item.tags?.map((t) => (
                          <span
                            key={t}
                            className="text-[10px] font-bold text-cyan-400 bg-cyan-500/10 px-1 py-0.2 rounded"
                          >
                            {t}
                          </span>
                        ))}

                        {item.scheduled_date && (
                          <span className="flex items-center gap-1 text-[10px] text-gray-400">
                            <Calendar className="h-2.5 w-2.5 text-amber-400" />
                            <span>{formatFriendlyDate(item.scheduled_date)}</span>
                          </span>
                        )}
                      </div>

                      {/* Título com Highlight */}
                      <p className="text-xs sm:text-sm font-semibold text-white leading-snug">
                        {highlightMatch(item.title)}
                      </p>

                      {/* Racional de Decisão */}
                      {item.decision_rationale && (
                        <p className="text-[11px] text-amber-300/90 italic truncate">
                          Motivo: {highlightMatch(item.decision_rationale)}
                        </p>
                      )}

                      {/* Prévia do Conteúdo */}
                      {item.content && (
                        <p className="text-[11px] text-gray-400 truncate">
                          {highlightMatch(item.content)}
                        </p>
                      )}
                    </div>

                    <ArrowRight className="h-4 w-4 text-gray-500 group-hover:text-white shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Rodapé com Dica de Teclado */}
        <div className="border-t border-border/60 px-4 py-2 bg-[#101014] flex items-center justify-between text-[11px] text-gray-500">
          <div className="flex items-center gap-3">
            <span>↑↓ para navegar</span>
            <span>↵ Enter para abrir</span>
          </div>
          <span>Atalho global: ⌘F</span>
        </div>
      </div>
    </div>
  );
}
