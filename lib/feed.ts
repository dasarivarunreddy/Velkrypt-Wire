import 'server-only';
import Parser from 'rss-parser';
import { createAdminClient } from '@/lib/supabase/admin';
import { KEV_URL, type KevEntry } from '@/lib/kev';

/** Trusted sources the auto feed watches. Add or remove freely. */
export const FEED_SOURCES = [
  { name: 'CISA Advisories', url: 'https://www.cisa.gov/cybersecurity-advisories/all.xml' },
  { name: 'NCSC UK', url: 'https://www.ncsc.gov.uk/api/1/services/v1/all-rss-feed.xml' },
  { name: 'BleepingComputer', url: 'https://www.bleepingcomputer.com/feed/' },
  { name: 'The Hacker News', url: 'https://feeds.feedburner.com/TheHackersNews' },
  { name: 'Krebs on Security', url: 'https://krebsonsecurity.com/feed/' },
  { name: 'SecurityWeek', url: 'https://www.securityweek.com/feed/' },
];

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

  await Promise.all(FEED_SOURCES.map(async (src) => {
    try {
      const feed = await parser.parseURL(src.url);
      for (const item of feed.items.slice(0, 25)) {
        const url = item.link?.trim();
        if (!url || !/^https?:\/\//.test(url) || !item.title) continue;
        const date = item.isoDate || item.pubDate || null;
        if (date && new Date(date).getTime() < since) continue;
        const text = strip(item.contentSnippet || item.content || item.summary || '');
        rows.push({
          source: src.name, title: clip(strip(item.title), 200), url,
          summary: clip(text, 280), // short snippet for the editor only; never published as-is
          cves: [...new Set(`${item.title} ${text}`.toUpperCase().match(CVE_RE) ?? [])].slice(0, 10),
          published_at: date ? new Date(date).toISOString() : null,
        });
      }
    } catch (e) {
      errors.push(`${src.name}: ${(e as Error).message}`);
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
