-- ==============================================================================
-- Schema do Supabase para o Sistema de Organização (Fase 1)
-- Copie e cole este script no SQL Editor do seu projeto Supabase e clique em "Run".
-- ==============================================================================

-- 1. Criação da tabela de Frentes / Áreas
create table if not exists public.frentes (
  id text primary key,
  name text not null,
  slug text not null unique,
  color text not null,
  display_order int default 0,
  created_at timestamptz default now()
);

-- 2. Inserção das 4 Frentes Iniciais
insert into public.frentes (id, name, slug, color, display_order)
values
  ('divino-pao', 'Divino Pão', 'divino', '#F59E0B', 1),
  ('bendito-sabor', 'Bendito Sabor', 'bendito', '#EF4444', 2),
  ('projetos', 'Projetos', 'proj', '#8B5CF6', 3),
  ('vida-pessoal', 'Vida Pessoal', 'pessoal', '#06B6D4', 4)
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  color = excluded.color,
  display_order = excluded.display_order;

-- 3. Criação da tabela de Itens (Tarefas, Ideias, Decisões e Rituais)
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text,
  type text not null default 'task' check (type in ('task', 'note', 'decision')),
  area_id text references public.frentes(id) on delete set null,
  scheduled_date text, -- Formato YYYY-MM-DD
  scheduled_time text, -- Formato HH:MM
  priority text not null default 'normal' check (priority in ('normal', 'high')),
  effort text check (effort is null or effort in ('quick', 'medium', 'long')),
  recurrence text,
  advance_warning_days int, -- Aviso prévio configurável (ex: 2 dias antes)
  is_recurring boolean default false,
  parent_recurrence_id text,
  energy_level text check (energy_level is null or energy_level in ('low', 'medium', 'high')),
  subtasks jsonb default '[]'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'completed', 'archived')),
  created_at timestamptz default now(),
  completed_at timestamptz
);

-- Migrações idempotentes caso a tabela já tenha sido criada em versão anterior
alter table public.items add column if not exists content text;
alter table public.items add column if not exists advance_warning_days int;
alter table public.items add column if not exists is_recurring boolean default false;
alter table public.items add column if not exists parent_recurrence_id text;
alter table public.items add column if not exists energy_level text;
alter table public.items add column if not exists subtasks jsonb default '[]'::jsonb;

-- Índices para buscas rápidas
create index if not exists idx_items_status on public.items (status);
create index if not exists idx_items_scheduled_date on public.items (scheduled_date);
create index if not exists idx_items_area_id on public.items (area_id);

-- 4. Habilitar Row Level Security (RLS) com políticas de leitura e gravação anônima direta
-- Permite sincronização imediata sem atrito de telas de login no celular e no PC
alter table public.frentes enable row level security;
alter table public.items enable row level security;

-- Políticas para frentes
create policy "Acesso público às frentes"
  on public.frentes for all
  using (true)
  with check (true);

-- Políticas para items
create policy "Acesso público aos itens"
  on public.items for all
  using (true)
  with check (true);

-- Habilitar Realtime para a tabela items (opcional para updates instantâneos)
alter publication supabase_realtime add table public.items;
