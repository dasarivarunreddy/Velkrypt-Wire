-- =====================================================================
-- Velkrypt Wire Phase 1: AI newsroom
-- Run once in Supabase SQL Editor, after security.sql and roles.sql.
-- Safe to run more than once.
-- =====================================================================
create extension if not exists pg_trgm;

-- ---------- Editorial workflow on articles ----------
alter table public.articles drop constraint if exists articles_status_check;
alter table public.articles add constraint articles_status_check check (status in ('draft', 'review', 'scheduled', 'published'));
alter table public.articles add column if not exists scheduled_for timestamptz;
alter table public.articles add column if not exists verification text check (verification in ('official', 'confirmed', 'claimed', 'investigating'));
alter table public.articles add column if not exists ai_generated boolean not null default false;
alter table public.articles add column if not exists ai_checks jsonb not null default '[]';
alter table public.articles add column if not exists sources jsonb not null default '[]';      -- [{name,url}]
alter table public.articles add column if not exists entities text[] not null default '{}';    -- companies/products named
alter table public.articles add column if not exists developing boolean not null default false;
alter table public.articles add column if not exists priority text not null default 'normal' check (priority in ('normal', 'high', 'breaking'));
alter table public.articles add column if not exists claimed_by uuid references public.profiles(id) on delete set null;
alter table public.articles add column if not exists claimed_at timestamptz;
alter table public.articles add column if not exists reviewed_by uuid references public.profiles(id) on delete set null;
alter table public.articles add column if not exists escalated_at timestamptz;
create index if not exists articles_title_trgm on public.articles using gin (title gin_trgm_ops);
create index if not exists articles_cves_idx on public.articles using gin (cves);
create index if not exists articles_status_idx on public.articles (status, created_at desc);

-- Writers may submit for review; only publishers may publish or schedule.
drop policy if exists "articles insert" on public.articles;
drop policy if exists "articles update" on public.articles;
create policy "articles insert" on public.articles for insert with check (
  public.has_perm('write') and author_id = auth.uid() and ((status in ('draft', 'review') and not is_lead) or public.has_perm('publish')));
create policy "articles update" on public.articles for update
  using ((public.has_perm('write') and author_id = auth.uid()) or public.has_perm('edit_all'))
  with check ((status in ('draft', 'review') and not is_lead) or public.has_perm('publish'));

-- ---------- Developing-story timeline ----------
create table if not exists public.article_updates (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles(id) on delete cascade,
  body_md text not null check (char_length(body_md) between 3 and 4000),
  source_name text,
  source_url text check (source_url is null or source_url ~ '^https?://'),
  status text not null default 'pending' check (status in ('pending', 'published', 'rejected')),
  ai_generated boolean not null default false,
  author_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  published_at timestamptz
);
create index if not exists article_updates_article_idx on public.article_updates (article_id, created_at desc);
alter table public.article_updates enable row level security;
drop policy if exists "updates public read" on public.article_updates;
create policy "updates public read" on public.article_updates for select using (
  (status = 'published' and exists (select 1 from public.articles a where a.id = article_id and a.status = 'published'))
  or public.has_perm('write'));
drop policy if exists "updates staff write" on public.article_updates;
create policy "updates staff write" on public.article_updates for all
  using (public.has_perm('publish') or (public.has_perm('write') and author_id = auth.uid()))
  with check (status = 'pending' or public.has_perm('publish'));

-- ---------- Public corrections log ----------
create table if not exists public.corrections (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles(id) on delete cascade,
  note text not null check (char_length(note) between 3 and 1000),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.corrections enable row level security;
drop policy if exists "corrections public read" on public.corrections;
create policy "corrections public read" on public.corrections for select using (true);
drop policy if exists "corrections publishers write" on public.corrections;
create policy "corrections publishers write" on public.corrections for insert with check (public.has_perm('publish'));

-- ---------- Staff notifications ----------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('review', 'update', 'ai_published', 'breaking', 'escalation', 'system', 'tip')),
  title text not null,
  body text,
  link text,
  needs_perm text not null default 'write',
  created_at timestamptz not null default now()
);
create index if not exists notifications_created_idx on public.notifications (created_at desc);
create table if not exists public.notification_reads (
  user_id uuid not null references public.profiles(id) on delete cascade,
  notification_id uuid not null references public.notifications(id) on delete cascade,
  primary key (user_id, notification_id)
);
alter table public.notifications enable row level security;
alter table public.notification_reads enable row level security;
drop policy if exists "notifications staff read" on public.notifications;
create policy "notifications staff read" on public.notifications for select using (public.has_perm(needs_perm));
drop policy if exists "reads own" on public.notification_reads;
create policy "reads own" on public.notification_reads for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- Site settings (AI kill switch etc.) ----------
create table if not exists public.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.settings enable row level security;
drop policy if exists "settings owner" on public.settings;
create policy "settings owner" on public.settings for select using (public.is_owner());
insert into public.settings (key, value) values
  ('ai', '{"enabled": true, "autopublish_official": true, "daily_request_limit": 300, "escalation_minutes": 20, "min_importance": 3}')
on conflict (key) do nothing;

-- ---------- AI usage per provider per day ----------
create table if not exists public.ai_usage (
  day date not null default current_date,
  provider text not null,
  requests integer not null default 0,
  failures integer not null default 0,
  primary key (day, provider)
);
alter table public.ai_usage enable row level security;
drop policy if exists "ai usage owner" on public.ai_usage;
create policy "ai usage owner" on public.ai_usage for select using (public.is_owner());

create or replace function public.bump_ai_usage(p text, ok boolean)
returns void language sql security definer set search_path = public as $$
  insert into public.ai_usage (day, provider, requests, failures) values (current_date, p, 1, case when ok then 0 else 1 end)
  on conflict (day, provider) do update set requests = ai_usage.requests + 1,
    failures = ai_usage.failures + case when ok then 0 else 1 end;
$$;
revoke execute on function public.bump_ai_usage(text, boolean) from public, anon, authenticated;

-- ---------- Feed items: what the AI decided ----------
alter table public.feed_items add column if not exists ai_status text not null default 'pending'
  check (ai_status in ('pending', 'skipped', 'drafted', 'published', 'duplicate', 'update', 'error'));
alter table public.feed_items add column if not exists ai_note text;
alter table public.feed_items add column if not exists importance integer;
create index if not exists feed_items_ai_idx on public.feed_items (ai_status, created_at desc);

-- ---------- Duplicate finder ----------
create or replace function public.find_similar_articles(p_title text, p_cves text[], p_urls text[], p_exclude uuid default null)
returns table (id uuid, slug text, title text, status text, ai_generated boolean, created_at timestamptz, score real)
language sql stable security definer set search_path = public as $$
  select a.id, a.slug, a.title, a.status, a.ai_generated, a.created_at,
         greatest(
           similarity(a.title, coalesce(p_title, '')),
           case when a.cves && coalesce(p_cves, '{}') then 1.0 else 0 end,
           case when a.source_url = any(coalesce(p_urls, '{}')) then 1.0 else 0 end
         )::real as score
  from public.articles a
  where a.created_at > now() - interval '21 days'
    and (p_exclude is null or a.id <> p_exclude)
    and (similarity(a.title, coalesce(p_title, '')) > 0.38
         or a.cves && coalesce(p_cves, '{}')
         or a.source_url = any(coalesce(p_urls, '{}')))
  order by score desc, a.created_at desc
  limit 5;
$$;
revoke execute on function public.find_similar_articles(text, text[], text[], uuid) from public, anon;

-- ---------- Reader tips ----------
create table if not exists public.tips (
  id uuid primary key default gen_random_uuid(),
  message text not null check (char_length(message) between 10 and 5000),
  link text,
  contact text,
  status text not null default 'new' check (status in ('new', 'read', 'archived')),
  created_at timestamptz not null default now()
);
alter table public.tips enable row level security;
drop policy if exists "tips staff" on public.tips;
create policy "tips staff" on public.tips for select using (public.has_perm('tips'));

-- Editors and admins get the new tips permission.
update public.profiles set permissions = array_append(permissions, 'tips')
  where role in ('editor', 'admin') and not ('tips' = any(permissions));

-- ---------- Email daily-cap queue (free email plans have a daily limit) ----------
create table if not exists public.email_usage (day date primary key default current_date, sent integer not null default 0);
create table if not exists public.newsletter_queue (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid references public.newsletter_issues(id) on delete cascade,
  email text not null,
  token uuid not null,
  subject text not null,
  html text not null,
  text_body text not null,
  created_at timestamptz not null default now()
);
alter table public.email_usage enable row level security;
alter table public.newsletter_queue enable row level security;

create or replace function public.bump_email_usage(n integer)
returns integer language sql security definer set search_path = public as $$
  insert into public.email_usage (day, sent) values (current_date, n)
  on conflict (day) do update set sent = email_usage.sent + n
  returning sent;
$$;
revoke execute on function public.bump_email_usage(integer) from public, anon, authenticated;
