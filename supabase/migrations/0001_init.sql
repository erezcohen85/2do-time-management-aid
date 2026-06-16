-- ───────────────────────── 2DO initial schema ─────────────────────────
-- Single-user-per-account model. Every row is owned by auth.uid() and locked
-- down with Row-Level Security so no account can read another's data.
-- Apply with: supabase db push   (or paste into the Supabase SQL editor)

create extension if not exists "pgcrypto";

-- ── areas ──
create table if not exists public.areas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null,
  color       text not null default '#4f46e5',
  icon        text,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

-- ── projects ──
create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  area_id     uuid not null references public.areas (id) on delete cascade,
  name        text not null,
  description text,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

-- ── tasks ──
create table if not exists public.tasks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id   uuid not null references public.projects (id) on delete cascade,
  title        text not null,
  description  text,
  notes        text,
  due_at       timestamptz,
  remind_at    timestamptz,
  completed    boolean not null default false,
  completed_at timestamptz,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);

-- ── subtasks (1 level under task) ──
create table if not exists public.subtasks (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null default auth.uid() references auth.users (id) on delete cascade,
  task_id               uuid not null references public.tasks (id) on delete cascade,
  title                 text not null,
  completed             boolean not null default false,
  waiting_on_subtask_id uuid references public.subtasks (id) on delete set null,
  sort_order            int not null default 0,
  created_at            timestamptz not null default now()
);

-- ── checklist items (under a subtask) ──
create table if not exists public.checklist_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  subtask_id  uuid not null references public.subtasks (id) on delete cascade,
  text        text not null,
  completed   boolean not null default false,
  sort_order  int not null default 0
);

-- ── links (polymorphic: project | task | subtask) ──
create table if not exists public.links (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  parent_type text not null check (parent_type in ('project','task','subtask')),
  parent_id   uuid not null,
  url         text not null,
  title       text,
  provider    text not null default 'web',
  sort_order  int not null default 0
);
create index if not exists links_parent_idx on public.links (parent_type, parent_id);

-- ── per-user settings ──
create table if not exists public.user_settings (
  user_id           uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  link_display_mode text not null default 'chips' check (link_display_mode in ('chips','list')),
  theme             text not null default 'light'
);

-- ───────────────────────── Row-Level Security ─────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'areas','projects','tasks','subtasks','checklist_items','links','user_settings'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format($f$
      create policy %I_owner on public.%I
        for all
        using (user_id = auth.uid())
        with check (user_id = auth.uid());
    $f$, t, t);
  end loop;
end $$;
