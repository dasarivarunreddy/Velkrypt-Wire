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
