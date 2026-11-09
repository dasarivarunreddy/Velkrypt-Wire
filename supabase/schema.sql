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
