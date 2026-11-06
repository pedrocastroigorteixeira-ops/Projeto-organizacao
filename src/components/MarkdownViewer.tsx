'use client';

import React from 'react';

interface MarkdownViewerProps {
  content: string;
  className?: string;
}

/**
 * Renderizador ultraveloz e leve de Markdown nativo sem dependências externas pesadas.
 * Suporta títulos (#, ##, ###), negrito, itálico, listas, checklists, citações, código inline
 * e realce automático de contextos (@loja, @investimentos, @pessoal).
 */
export function MarkdownViewer({ content, className = '' }: MarkdownViewerProps) {
  if (!content) return null;

  const lines = content.split('\n');

  // Formata elementos inline (negrito, itálico, código e tags @contexto)
  const renderInline = (text: string): React.ReactNode[] => {
    // Regex para capturar tags @contexto, negrito, itálico e código inline
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|@[a-zA-Z0-9À-ÿ_-]+)/g);

    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={idx} className="font-bold text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return (
          <em key={idx} className="italic text-gray-200">
            {part.slice(1, -1)}
          </em>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={idx}
            className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-[11px] text-amber-300 border border-border"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part.startsWith('@')) {
        return (
          <span
            key={idx}
            className="inline-flex items-center rounded-md bg-cyan-500/15 px-1.5 py-0.2 text-[11px] font-semibold text-cyan-300 border border-cyan-500/30 mr-0.5"
          >
            {part}
          </span>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  return (
    <div className={`space-y-1.5 text-xs sm:text-sm text-gray-300 leading-relaxed ${className}`}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        // Título H1
        if (trimmed.startsWith('# ')) {
          return (
            <h1
              key={idx}
              className="text-base sm:text-lg font-bold text-white pt-2 pb-1 border-b border-border/50"
            >
              {renderInline(trimmed.slice(2))}
            </h1>
          );
        }

        // Título H2
        if (trimmed.startsWith('## ')) {
          return (
            <h2
              key={idx}
              className="text-sm sm:text-base font-bold text-gray-100 pt-1.5 pb-0.5"
            >
              {renderInline(trimmed.slice(3))}
            </h2>
          );
        }

        // Título H3
        if (trimmed.startsWith('### ')) {
          return (
            <h3 key={idx} className="text-xs sm:text-sm font-bold text-amber-300 pt-1">
              {renderInline(trimmed.slice(4))}
            </h3>
          );
        }

        // Checklist interativo / marcado (- [x] ou - [ ])
        if (trimmed.startsWith('- [x] ') || trimmed.startsWith('- [X] ')) {
          return (
            <div key={idx} className="flex items-start gap-2 text-gray-400 line-through pl-1">
              <span className="h-4 w-4 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                ✓
              </span>
              <span>{renderInline(trimmed.slice(6))}</span>
            </div>
          );
        }

        if (trimmed.startsWith('- [ ] ')) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1">
              <span className="h-4 w-4 rounded bg-surface border border-gray-500 shrink-0 mt-0.5" />
              <span>{renderInline(trimmed.slice(6))}</span>
            </div>
          );
        }

        // Lista com marcadores (- ou *)
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-2">
              <span className="text-amber-400 select-none">•</span>
              <span>{renderInline(trimmed.slice(2))}</span>
            </div>
          );
        }

        // Citação (> )
        if (trimmed.startsWith('> ')) {
          return (
            <blockquote
              key={idx}
              className="border-l border-neutral-700 pl-3.5 py-1 my-1.5 italic text-neutral-300 bg-surface/50 rounded-r"
            >
              {renderInline(trimmed.slice(2))}
            </blockquote>
          );
        }

        // Linha vazia
        if (!trimmed) {
          return <div key={idx} className="h-1.5" />;
        }

        // Parágrafo comum
        return <p key={idx}>{renderInline(line)}</p>;
      })}
    </div>
  );
}
