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
