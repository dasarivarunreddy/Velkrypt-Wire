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
