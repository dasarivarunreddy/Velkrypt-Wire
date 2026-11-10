import 'server-only';
import Parser from 'rss-parser';
import { createAdminClient } from '@/lib/supabase/admin';
import { KEV_URL, type KevEntry } from '@/lib/kev';

/** Fallback list, used only until supabase/sources.sql has been run. Manage sources in Admin → Sources. */
export const FEED_SOURCES = [
  { name: 'CISA Advisories', url: 'https://www.cisa.gov/cybersecurity-advisories/all.xml' },
  { name: 'NCSC UK', url: 'https://www.ncsc.gov.uk/api/1/services/v1/all-rss-feed.xml' },
  { name: 'BleepingComputer', url: 'https://www.bleepingcomputer.com/feed/' },
  { name: 'The Hacker News', url: 'https://feeds.feedburner.com/TheHackersNews' },
];

type Source = { id?: string; name: string; url: string; kind?: 'rss' | 'page'; link_match?: string | null };

async function loadSources(): Promise<Source[]> {
  const { data, error } = await createAdminClient().from('feed_sources').select('id,name,url,kind,link_match').eq('enabled', true);
  return error || !data?.length ? FEED_SOURCES : (data as Source[]);
}

type Item = { title: string; link: string; date: string | null; text: string };

/** Reads an advisory listing page (for agencies without RSS, e.g. CERT-In) and returns matching links. */
async function readPage(src: Source): Promise<Item[]> {
  const res = await fetch(src.url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VelkryptWire/1.0; +https://velkrypt.online)' }, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  const re = new RegExp(src.link_match || '.', 'i');
  const items: Item[] = [];
  for (const m of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const text = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const href = m[1].replace(/&amp;/g, '&');
    if (!text || !(re.test(text) || re.test(href))) continue;
    let link: string;
    try { link = new URL(href, src.url).toString(); } catch { continue; }
    if (!/^https?:/.test(link) || items.some((i) => i.link === link)) continue;
    const date = text.match(/\b(\d{1,2}[-/ ][A-Za-z]{3,9}[-/ ]\d{4}|\d{4}-\d{2}-\d{2})\b/)?.[1];
    items.push({ title: text.slice(0, 200), link, date: date && !isNaN(Date.parse(date)) ? new Date(date).toISOString() : null, text });
    if (items.length >= 25) break;
  }
  if (!items.length) throw new Error('No matching links found on the page. Check the URL and the link pattern.');
  return items;
}

/** Tests one source and records whether it works (used by Admin → Sources). */
export async function testSource(src: Source) {
  try {
    const items = src.kind === 'page' ? await readPage(src) : (await new Parser({ timeout: 15000 }).parseURL(src.url)).items;
    if (src.id) await createAdminClient().from('feed_sources').update({ last_ok: new Date().toISOString(), last_error: null, last_checked: new Date().toISOString() }).eq('id', src.id);
    return { ok: true, message: `Working: ${items.length} items found. Latest: "${String((items[0] as { title?: string })?.title ?? '').slice(0, 80)}"` };
  } catch (e) {
    if (src.id) await createAdminClient().from('feed_sources').update({ last_error: (e as Error).message.slice(0, 300), last_checked: new Date().toISOString() }).eq('id', src.id);
    return { ok: false, message: (e as Error).message };
  }
}

const CVE_RE = /CVE-\d{4}-\d{4,}/gi;
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);
const strip = (s = '') => s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

type Row = { source: string; title: string; url: string; summary: string; cves: string[]; published_at: string | null };

/** Pulls the latest items from every source into feed_items (status 'new') for an editor to review. */
export async function runFeed() {
  const rows: Row[] = [];
  const errors: string[] = [];
  const parser = new Parser({ timeout: 15000, headers: { 'User-Agent': 'VelkryptWire/1.0 (+news aggregator)' } });
  const since = Date.now() - 7 * 24 * 3600 * 1000;

  const sources = await loadSources();
  const db = createAdminClient();
  await Promise.all(sources.map(async (src) => {
    try {
      let list: Item[];
      if (src.kind === 'page') list = await readPage(src);
      else {
        const feed = await parser.parseURL(src.url);
        list = feed.items.slice(0, 25).map((i) => ({ title: i.title ?? '', link: i.link?.trim() ?? '', date: i.isoDate || i.pubDate || null, text: strip(i.contentSnippet || i.content || i.summary || '') }));
      }
      for (const item of list) {
        const url = item.link;
        if (!url || !/^https?:\/\//.test(url) || !item.title) continue;
        if (item.date && new Date(item.date).getTime() < since) continue;
        rows.push({
          source: src.name, title: clip(strip(item.title), 200), url,
          summary: clip(item.text, 280), // short snippet for the editor only; never published as-is
          cves: [...new Set(`${item.title} ${item.text}`.toUpperCase().match(CVE_RE) ?? [])].slice(0, 10),
          published_at: item.date ? new Date(item.date).toISOString() : null,
        });
      }
      if (src.id) await db.from('feed_sources').update({ last_ok: new Date().toISOString(), last_error: null, last_checked: new Date().toISOString() }).eq('id', src.id);
    } catch (e) {
      errors.push(`${src.name}: ${(e as Error).message}`);
      if (src.id) await db.from('feed_sources').update({ last_error: (e as Error).message.slice(0, 300), last_checked: new Date().toISOString() }).eq('id', src.id);
    }
  }));

  try {
    const res = await fetch(KEV_URL, { cache: 'no-store' });
    const data = (await res.json()) as { vulnerabilities: KevEntry[] };
    for (const k of data.vulnerabilities.filter((v) => new Date(v.dateAdded).getTime() >= since)) {
      rows.push({
        source: 'CISA KEV',
        title: clip(`${k.cveID}: ${k.vulnerabilityName}`, 200),
        url: `https://nvd.nist.gov/vuln/detail/${k.cveID}`,
        summary: clip(`${k.shortDescription} Federal due date: ${k.dueDate}.${k.knownRansomwareCampaignUse === 'Known' ? ' Known ransomware use.' : ''}`, 280),
        cves: [k.cveID],
        published_at: new Date(k.dateAdded).toISOString(),
      });
    }
  } catch (e) {
    errors.push(`CISA KEV: ${(e as Error).message}`);
  }

  let added = 0;
  if (rows.length) {
    const { data, error } = await createAdminClient().from('feed_items').upsert(rows, { onConflict: 'url', ignoreDuplicates: true }).select('id');
    if (error) errors.push(`Database: ${error.message}`);
    added = data?.length ?? 0;
  }
  return { checked: rows.length, added, errors };
}
