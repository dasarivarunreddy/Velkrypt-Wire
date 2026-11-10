-- =====================================================================
-- Velkrypt Wire Phase 2: Learn & Careers
-- Run once in Supabase SQL Editor (after newsroom.sql). Safe to run more than once.
-- =====================================================================

-- Learning progress: which roadmap steps each reader has finished.
create table if not exists public.user_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  item text not null check (char_length(item) <= 60),
  done_at timestamptz not null default now(),
  primary key (user_id, item)
);
alter table public.user_progress enable row level security;
drop policy if exists "progress own" on public.user_progress;
create policy "progress own" on public.user_progress for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Curated CTF calendar (added by staff; each links to the official event page).
create table if not exists public.ctf_events (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  url text not null check (url ~ '^https?://'),
  ctftime_url text check (ctftime_url is null or ctftime_url ~ '^https?://'),
  format text not null default 'Jeopardy' check (format in ('Jeopardy', 'Attack-Defence', 'Mixed', 'King of the Hill', 'Other')),
  location text not null default 'Online',
  level text not null default 'beginner' check (level in ('beginner', 'intermediate', 'advanced')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  student_friendly boolean not null default false,
  uk boolean not null default false,
  note text check (char_length(note) <= 500),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index if not exists ctf_events_start_idx on public.ctf_events (starts_at);
alter table public.ctf_events enable row level security;
drop policy if exists "ctf public read" on public.ctf_events;
create policy "ctf public read" on public.ctf_events for select using (true);
drop policy if exists "ctf staff write" on public.ctf_events;
create policy "ctf staff write" on public.ctf_events for all using (public.has_perm('learn')) with check (public.has_perm('learn'));

-- "Remind me" for CTFs (emailed about a day before the start).
create table if not exists public.ctf_reminders (
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid not null references public.ctf_events(id) on delete cascade,
  sent_at timestamptz,
  primary key (user_id, event_id)
);
alter table public.ctf_reminders enable row level security;
drop policy if exists "reminders own" on public.ctf_reminders;
create policy "reminders own" on public.ctf_reminders for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Weekly link checks for the free resources directory.
create table if not exists public.link_checks (
  url text primary key,
  ok boolean not null,
  status integer,
  checked_at timestamptz not null default now()
);
alter table public.link_checks enable row level security;
drop policy if exists "link checks public read" on public.link_checks;
create policy "link checks public read" on public.link_checks for select using (true);

-- Editors and admins can manage the learning hub and CTF calendar.
update public.profiles set permissions = array_append(permissions, 'learn')
  where role in ('editor', 'admin') and not ('learn' = any(permissions));
