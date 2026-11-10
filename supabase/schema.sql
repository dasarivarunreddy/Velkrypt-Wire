-- =====================================================================
-- Velkrypt Wire database schema
-- Run this once in Supabase: SQL Editor -> New query -> paste -> Run.
-- Every table has Row Level Security on, so the public anon key can only
-- read what readers are allowed to see.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- Profiles (one per account) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (char_length(display_name) <= 60),
  role text not null default 'reader' check (role in ('reader', 'editor', 'admin')),
  is_premium boolean not null default false,
  stripe_customer_id text unique,
  subscription_status text,
  created_at timestamptz not null default now()
);

-- Create a profile automatically when someone signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper checks used by policies. security definer avoids policy recursion.
create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('editor', 'admin'));
$$;

create or replace function public.is_premium_user()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and (is_premium or role in ('editor', 'admin')));
$$;

-- ---------- Articles ----------
-- Search document builder. Marked immutable so it can power a generated column
-- (array_to_string on its own is only "stable").
create or replace function public.article_search(t text, e text, c text[], g text[])
returns tsvector language sql immutable parallel safe as $$
  select setweight(to_tsvector('english'::regconfig, coalesce(t, '')), 'A') ||
         setweight(to_tsvector('english'::regconfig, coalesce(e, '')), 'B') ||
         setweight(to_tsvector('simple'::regconfig, coalesce(array_to_string(c, ' '), '') || ' ' || coalesce(array_to_string(g, ' '), '')), 'A')
$$;

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 5 and 200),
  excerpt text not null default '' check (char_length(excerpt) <= 400),
  body_md text not null default '',          -- free part (the whole story for free articles, a teaser for premium ones)
  category text not null check (category in ('Vulnerabilities', 'Breaches', 'Threats', 'AI Security', 'Policy', 'Guides')),
  severity text not null default 'info' check (severity in ('critical', 'high', 'medium', 'info')),
  cves text[] not null default '{}',
  tags text[] not null default '{}',
  source_name text,
  source_url text check (source_url is null or source_url ~ '^https?://'),
  is_premium boolean not null default false,
  is_lead boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'published')),
  author_id uuid references public.profiles(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search tsvector generated always as (public.article_search(title, excerpt, cves, tags)) stored
);
create index if not exists articles_published_idx on public.articles (status, published_at desc);
create index if not exists articles_search_idx on public.articles using gin (search);

-- Premium body lives in its own table so the database itself refuses to
-- send it to non-members (a column cannot be hidden by RLS, a table can).
create table if not exists public.article_premium (
  article_id uuid primary key references public.articles(id) on delete cascade,
  body_md text not null default ''
);

-- ---------- Reader features ----------
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists comments_article_idx on public.comments (article_id, created_at);

create table if not exists public.bookmarks (
  user_id uuid not null references public.profiles(id) on delete cascade,
  article_id uuid not null references public.articles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, article_id)
);

-- ---------- Newsletter ----------
create table if not exists public.subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  status text not null default 'pending' check (status in ('pending', 'active', 'unsubscribed')),
  token uuid not null default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

create table if not exists public.newsletter_issues (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  body_md text not null,
  recipients integer not null default 0,
  sent_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null
);

-- ---------- Auto news feed ----------
create table if not exists public.feed_items (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  title text not null,
  url text not null unique,
  summary text,
  cves text[] not null default '{}',
  published_at timestamptz,
  status text not null default 'new' check (status in ('new', 'imported', 'dismissed')),
  article_id uuid references public.articles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists feed_items_status_idx on public.feed_items (status, published_at desc);

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.profiles enable row level security;
alter table public.articles enable row level security;
alter table public.article_premium enable row level security;
alter table public.comments enable row level security;
alter table public.bookmarks enable row level security;
alter table public.subscribers enable row level security;
alter table public.newsletter_issues enable row level security;
alter table public.feed_items enable row level security;

-- Profiles: you see yours, staff see all. Readers may only change their display name.
drop policy if exists "profiles read own" on public.profiles;
create policy "profiles read own" on public.profiles for select using (id = auth.uid() or public.is_staff());
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.profiles from authenticated, anon;
grant update (display_name) on public.profiles to authenticated;

-- Public display names for comment authors, without exposing roles or billing.
create or replace view public.public_profiles with (security_invoker = false) as
  select id, display_name from public.profiles;
grant select on public.public_profiles to anon, authenticated;

-- Articles: anyone reads published; staff manage everything.
drop policy if exists "articles public read" on public.articles;
create policy "articles public read" on public.articles for select using (status = 'published' or public.is_staff());
drop policy if exists "articles staff write" on public.articles;
create policy "articles staff write" on public.articles for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists "premium members read" on public.article_premium;
create policy "premium members read" on public.article_premium for select using (public.is_premium_user());
drop policy if exists "premium staff write" on public.article_premium;
create policy "premium staff write" on public.article_premium for all using (public.is_staff()) with check (public.is_staff());

-- Comments: public read on published articles; signed-in users post as themselves.
drop policy if exists "comments read" on public.comments;
create policy "comments read" on public.comments for select using (
  exists (select 1 from public.articles a where a.id = article_id and a.status = 'published'));
drop policy if exists "comments insert own" on public.comments;
create policy "comments insert own" on public.comments for insert with check (user_id = auth.uid());
drop policy if exists "comments delete own or staff" on public.comments;
create policy "comments delete own or staff" on public.comments for delete using (user_id = auth.uid() or public.is_staff());

-- Bookmarks: private to their owner.
drop policy if exists "bookmarks own" on public.bookmarks;
create policy "bookmarks own" on public.bookmarks for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Subscribers, issues and feed: staff only. Sign-ups go through server routes using the service key.
drop policy if exists "subscribers staff" on public.subscribers;
create policy "subscribers staff" on public.subscribers for select using (public.is_staff());
drop policy if exists "issues staff" on public.newsletter_issues;
create policy "issues staff" on public.newsletter_issues for all using (public.is_staff()) with check (public.is_staff());
drop policy if exists "feed staff" on public.feed_items;
create policy "feed staff" on public.feed_items for all using (public.is_staff()) with check (public.is_staff());

-- Keep updated_at fresh.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
drop trigger if exists articles_touch on public.articles;
create trigger articles_touch before update on public.articles for each row execute function public.touch_updated_at();

-- =====================================================================
-- After you sign up on the site, make yourself admin by running:
--   update public.profiles set role = 'admin'
--   where id = (select id from auth.users where email = 'you@example.com');
-- =====================================================================


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


-- =====================================================================
-- Velkrypt Wire: owner, staff roles, permissions and audit log
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.
-- Run security.sql first. Safe to run more than once.
-- =====================================================================

-- ---------- Roles and per-person permissions ----------
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('reader', 'writer', 'editor', 'admin', 'owner'));
alter table public.profiles add column if not exists permissions text[] not null default '{}';
create unique index if not exists profiles_single_owner on public.profiles (role) where role = 'owner';

-- Give existing staff their default permission sets.
update public.profiles set permissions = array['write','publish','edit_all','delete','feed','comments','newsletter','subscribers','users']
  where role = 'admin' and permissions = '{}';
update public.profiles set permissions = array['write','publish','edit_all','feed','comments']
  where role = 'editor' and permissions = '{}';

-- ---------- Permission checks (all require a 2FA-verified session) ----------
create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('writer','editor','admin','owner'))
     and coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2';
$$;

create or replace function public.is_owner()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
     and coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2';
$$;

create or replace function public.has_perm(p text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and (role = 'owner' or (role in ('writer','editor','admin') and p = any(permissions)))
  ) and coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2';
$$;

create or replace function public.is_premium_user()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and (is_premium or role in ('writer','editor','admin','owner')));
$$;

-- ---------- The owner can never be changed from the website ----------
-- Only someone with direct database access (you, in the SQL editor) can move the owner role.
create or replace function public.guard_owner()
returns trigger language plpgsql as $$
begin
  if (old.role = 'owner' or new.role = 'owner') and old.role is distinct from new.role
     and coalesce(current_setting('vw.owner_change', true), '') <> 'yes' then
    raise exception 'The owner role can only be changed from the Supabase SQL editor.';
  end if;
  if old.role = 'owner' then
    new.permissions := old.permissions;
    new.is_premium := old.is_premium;
  end if;
  return new;
end $$;
drop trigger if exists profiles_guard_owner on public.profiles;
create trigger profiles_guard_owner before update on public.profiles for each row execute function public.guard_owner();

create or replace function public.guard_owner_delete()
returns trigger language plpgsql as $$
begin
  if old.role = 'owner' and coalesce(current_setting('vw.owner_change', true), '') <> 'yes' then
    raise exception 'The owner account cannot be deleted from the website.';
  end if;
  return old;
end $$;
drop trigger if exists profiles_guard_owner_delete on public.profiles;
create trigger profiles_guard_owner_delete before delete on public.profiles for each row execute function public.guard_owner_delete();

-- ---------- Policies ----------
drop policy if exists "profiles read own" on public.profiles;
create policy "profiles read own" on public.profiles for select
  using (id = auth.uid() or public.has_perm('users'));

-- Articles: everyone reads published. Staff see their own drafts; editors with edit_all see all.
drop policy if exists "articles public read" on public.articles;
drop policy if exists "articles staff write" on public.articles;
drop policy if exists "articles read" on public.articles;
drop policy if exists "articles insert" on public.articles;
drop policy if exists "articles update" on public.articles;
drop policy if exists "articles delete" on public.articles;
create policy "articles read" on public.articles for select using (
  status = 'published' or (public.is_staff() and (author_id = auth.uid() or public.has_perm('edit_all'))));
create policy "articles insert" on public.articles for insert with check (
  public.has_perm('write') and author_id = auth.uid() and ((status = 'draft' and not is_lead) or public.has_perm('publish')));
create policy "articles update" on public.articles for update
  using ((public.has_perm('write') and author_id = auth.uid()) or public.has_perm('edit_all'))
  with check ((status = 'draft' and not is_lead) or public.has_perm('publish'));
create policy "articles delete" on public.articles for delete using (public.has_perm('delete'));

drop policy if exists "premium staff write" on public.article_premium;
drop policy if exists "premium write" on public.article_premium;
create policy "premium write" on public.article_premium for all
  using (exists (select 1 from public.articles a where a.id = article_id
                 and ((public.has_perm('write') and a.author_id = auth.uid()) or public.has_perm('edit_all'))))
  with check (exists (select 1 from public.articles a where a.id = article_id
                 and ((public.has_perm('write') and a.author_id = auth.uid()) or public.has_perm('edit_all'))));

drop policy if exists "comments delete own or staff" on public.comments;
create policy "comments delete own or staff" on public.comments for delete
  using (user_id = auth.uid() or public.has_perm('comments'));

drop policy if exists "subscribers staff" on public.subscribers;
create policy "subscribers staff" on public.subscribers for select using (public.has_perm('subscribers'));

drop policy if exists "issues staff" on public.newsletter_issues;
create policy "issues staff" on public.newsletter_issues for all
  using (public.has_perm('newsletter')) with check (public.has_perm('newsletter'));

drop policy if exists "feed staff" on public.feed_items;
create policy "feed staff" on public.feed_items for all
  using (public.has_perm('feed')) with check (public.has_perm('feed'));

-- ---------- Audit log: who did what (only the owner can read it) ----------
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  actor_name text,
  action text not null,
  target text,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists audit_log_created_idx on public.audit_log (created_at desc);
alter table public.audit_log enable row level security;
drop policy if exists "audit owner read" on public.audit_log;
create policy "audit owner read" on public.audit_log for select using (public.is_owner());


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


-- =====================================================================
-- Velkrypt Wire Phase 4: author profiles
-- Run once in Supabase SQL Editor. Safe to run more than once.
-- =====================================================================
alter table public.profiles add column if not exists bio text check (bio is null or char_length(bio) <= 600);
alter table public.profiles add column if not exists job_title text check (job_title is null or char_length(job_title) <= 80);
alter table public.profiles add column if not exists linkedin text check (linkedin is null or linkedin ~ '^https://(www\.)?linkedin\.com/');
alter table public.profiles add column if not exists website text check (website is null or website ~ '^https://');

-- People may edit their own name and author details (never their role or permissions).
grant update (display_name, bio, job_title, linkedin, website) on public.profiles to authenticated;

-- Public author info for staff only (readers' profiles stay private).
create or replace view public.authors with (security_invoker = false) as
  select id, display_name, job_title, bio, linkedin, website, role from public.profiles
  where role in ('writer', 'editor', 'admin', 'owner');
grant select on public.authors to anon, authenticated;


-- =====================================================================
-- Velkrypt Wire: news sources you can manage from the admin panel
-- Run once in Supabase SQL Editor (after newsroom.sql). Safe to run more than once.
-- =====================================================================
create table if not exists public.feed_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  url text not null check (url ~ '^https://'),
  kind text not null default 'rss' check (kind in ('rss', 'page')),   -- page = read links from an advisory listing page
  link_match text,                                                    -- for page sources: only links whose text/URL match this (e.g. CIVN-|CIAD-)
  category text not null default 'news' check (category in ('government', 'vendor', 'news', 'research')),
  region text,
  enabled boolean not null default true,
  last_ok timestamptz,
  last_error text,
  last_checked timestamptz,
  created_at timestamptz not null default now()
);
alter table public.feed_sources enable row level security;
drop policy if exists "sources staff" on public.feed_sources;
create policy "sources staff" on public.feed_sources for select using (public.has_perm('feed'));

insert into public.feed_sources (name, url, kind, link_match, category, region) values
  -- Government CERTs and agencies
  ('CISA Advisories', 'https://www.cisa.gov/cybersecurity-advisories/all.xml', 'rss', null, 'government', 'US'),
  ('NCSC UK', 'https://www.ncsc.gov.uk/api/1/services/v1/all-rss-feed.xml', 'rss', null, 'government', 'UK'),
  ('CERT-EU', 'https://cert.europa.eu/publications/security-advisories-rss', 'rss', null, 'government', 'EU'),
  ('ACSC Australia: Alerts', 'https://www.cyber.gov.au/rss/alerts', 'rss', null, 'government', 'AU'),
  ('ACSC Australia: Advisories', 'https://www.cyber.gov.au/acsc/view-all-content/advisories/rss', 'rss', null, 'government', 'AU'),
  ('Canadian Centre for Cyber Security', 'https://www.cyber.gc.ca/api/cccs/rss/v1/get?feed=alerts_advisories&lang=en', 'rss', null, 'government', 'CA'),
  ('JPCERT/CC', 'https://www.jpcert.or.jp/english/rss/jpcert-en.rdf', 'rss', null, 'government', 'JP'),
  ('CERT-In: Vulnerability Notes', 'https://www.cert-in.org.in/s2cMainServlet?pageid=PUBVLNOTES02', 'page', 'CIVN-', 'government', 'IN'),
  ('CERT-In: Advisories', 'https://www.cert-in.org.in/s2cMainServlet?pageid=PUBADVLIST', 'page', 'CIAD-', 'government', 'IN'),
  -- Vendors
  ('Cisco PSIRT', 'https://sec.cloudapps.cisco.com/security/center/psirtrss20/CiscoSecurityAdvisory.xml', 'rss', null, 'vendor', null),
  ('Fortinet PSIRT', 'https://filestore.fortinet.com/fortiguard/rss/ir.xml', 'rss', null, 'vendor', null),
  ('Microsoft MSRC', 'https://api.msrc.microsoft.com/update-guide/rss', 'rss', null, 'vendor', null),
  -- News and research
  ('BleepingComputer', 'https://www.bleepingcomputer.com/feed/', 'rss', null, 'news', null),
  ('The Hacker News', 'https://feeds.feedburner.com/TheHackersNews', 'rss', null, 'news', null),
  ('SecurityWeek', 'https://www.securityweek.com/feed/', 'rss', null, 'news', null),
  ('Krebs on Security', 'https://krebsonsecurity.com/feed/', 'rss', null, 'research', null)
on conflict (name) do nothing;

-- Readers never see AI labels unless the owner turns them on (all AI drafts are reviewed by a named editor before publishing).
update public.settings set value = value || '{"show_ai_label": false}'::jsonb where key = 'ai' and not (value ? 'show_ai_label');
