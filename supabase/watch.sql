-- =====================================================================
-- Velkrypt Wire Phase 3: CVE pages + Stack Watch
-- Run once in Supabase SQL Editor (after learn.sql). Safe to run more than once.
-- =====================================================================

-- Cache of CVE details from NVD (refreshed daily when a page is viewed).
create table if not exists public.cves (
  id text primary key check (id ~ '^CVE-\d{4}-\d{4,}$'),
  description text,
  cvss numeric(3,1),
  severity text,
  vector text,
  cwe text[] not null default '{}',
  refs jsonb not null default '[]',
  published timestamptz,
  modified timestamptz,
  fetched_at timestamptz not null default now()
);
alter table public.cves enable row level security;
drop policy if exists "cves public read" on public.cves;
create policy "cves public read" on public.cves for select using (true);

-- Stack Watch: the vendors/products each reader wants alerts for.
create table if not exists public.watch_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  vendor text not null check (char_length(vendor) between 2 and 80),
  product text check (product is null or char_length(product) between 1 and 80),
  created_at timestamptz not null default now()
);
create unique index if not exists watch_items_unique on public.watch_items (user_id, lower(vendor), coalesce(lower(product), ''));
alter table public.watch_items enable row level security;
drop policy if exists "watch read own" on public.watch_items;
create policy "watch read own" on public.watch_items for select using (user_id = auth.uid());
drop policy if exists "watch delete own" on public.watch_items;
create policy "watch delete own" on public.watch_items for delete using (user_id = auth.uid());
-- Free accounts can watch 3 items; members (and staff) up to 100. Enforced by the database.
drop policy if exists "watch insert limited" on public.watch_items;
create policy "watch insert limited" on public.watch_items for insert with check (
  user_id = auth.uid()
  and (select count(*) from public.watch_items w where w.user_id = auth.uid())
      < case when public.is_premium_user() then 100 else 3 end);

-- Which alerts each reader has already been sent (so nobody gets the same alert twice).
create table if not exists public.watch_alerts (
  user_id uuid not null references public.profiles(id) on delete cascade,
  key text not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, key)
);
alter table public.watch_alerts enable row level security;
drop policy if exists "watch alerts own" on public.watch_alerts;
create policy "watch alerts own" on public.watch_alerts for select using (user_id = auth.uid());
