import { Area } from '../types';

export const INITIAL_AREAS: Area[] = [
  {
    id: 'divino-pao',
    name: 'Divino Pão',
    slug: 'divino',
    color: '#F59E0B',
    display_order: 1,
  },
  {
    id: 'bendito-sabor',
    name: 'Bendito Sabor',
    slug: 'bendito',
    color: '#EF4444',
    display_order: 2,
  },
  {
    id: 'projetos',
    name: 'Projetos',
    slug: 'proj',
    color: '#8B5CF6',
    display_order: 3,
  },
  {
    id: 'vida-pessoal',
    name: 'Vida Pessoal',
    slug: 'pessoal',
    color: '#06B6D4',
    display_order: 4,
  },
];

export const EFFORT_LABELS = {
  quick: {
    label: '~5min',
    name: 'Rápida',
    desc: 'Esforço rápido',
    badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  },
  medium: {
    label: '~30min',
    name: 'Média',
    desc: 'Esforço médio',
    badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  },
  long: {
    label: '+1h',
    name: 'Longa',
    desc: 'Esforço longo',
    badgeClass: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  },
} as const;

export const ENERGY_LEVELS = {
  low: {
    label: 'Baixo foco',
    desc: 'Tarefas leves, mecânicas ou automáticas',
    color: '#10B981',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
  medium: {
    label: 'Médio foco',
    desc: 'Tarefas normais do dia a dia',
    color: '#F59E0B',
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  },
  high: {
    label: 'Alto foco',
    desc: 'Tarefas analíticas, complexas ou estratégicas',
    color: '#EF4444',
    badgeClass: 'bg-red-500/15 text-red-300 border-red-500/30',
  },
} as const;
