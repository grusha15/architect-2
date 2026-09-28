-- Architect 2.0 prototype schema. Run in the Supabase SQL editor.

create extension if not exists pgcrypto;

-- Profiles: sets each user's default lens (builder / developer / both)
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  role text not null default 'both' check (role in ('builder', 'developer', 'both')),
  default_view text not null default 'preview' check (default_view in ('preview', 'code', 'agents')),
  full_name text,
  created_at timestamptz not null default now()
);

-- Projects: plan, chat, checkpoints, deployments and git state live in `data` (jsonb)
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  status text not null default 'draft',
  slug text unique,
  published boolean not null default false,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_user_updated on public.projects (user_id, updated_at desc);

alter table public.profiles enable row level security;
alter table public.projects enable row level security;

-- Profiles: users manage only their own row
drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- Projects: owners have full access
drop policy if exists "owner full access" on public.projects;
create policy "owner full access" on public.projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Deployed apps are publicly readable by slug
drop policy if exists "published apps are public" on public.projects;
create policy "published apps are public" on public.projects
  for select using (published = true);
