-- =====================================================================
-- Velkrypt Wire security upgrade
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.
-- Safe to run more than once.
-- =====================================================================

-- Staff powers now need a 2FA-verified session (aal2). A stolen admin
-- password alone can no longer write articles or read subscribers, even
-- by calling the database directly.
create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('editor', 'admin'))
     and coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2';
$$;

-- Browsers a user has verified with an emailed code (remembered 30 days).
create table if not exists public.trusted_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique,
  label text,
  country text,
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists trusted_devices_user_idx on public.trusted_devices (user_id);

-- One-time sign-in codes for new devices. Only a hash of the code is stored.
create table if not exists public.device_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code_hash text not null,
  attempts integer not null default 0,
  consumed boolean not null default false,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists device_challenges_user_idx on public.device_challenges (user_id, created_at desc);

-- Sign-in history shown on each reader's account page (kept 90 days).
create table if not exists public.login_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  event text not null,
  ip text,
  country text,
  city text,
  device text,
  created_at timestamptz not null default now()
);
create index if not exists login_events_user_idx on public.login_events (user_id, created_at desc);

alter table public.trusted_devices enable row level security;
alter table public.device_challenges enable row level security;
alter table public.login_events enable row level security;

-- Readers can see their own sign-in history; nothing else is readable from the browser.
drop policy if exists "login events read own" on public.login_events;
create policy "login events read own" on public.login_events for select using (user_id = auth.uid());
