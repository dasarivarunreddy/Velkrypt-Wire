import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

export const CVE_RE = /^CVE-\d{4}-\d{4,}$/;
export type CveRecord = { id: string; description: string | null; cvss: number | null; severity: string | null; vector: string | null; cwe: string[]; refs: { url: string; tags?: string[] }[]; published: string | null; modified: string | null; fetched_at: string };

type NvdCve = {
  id: string; published?: string; lastModified?: string;
  descriptions?: { lang: string; value: string }[];
  metrics?: Record<string, { cvssData: { baseScore: number; baseSeverity?: string; vectorString?: string } ; baseSeverity?: string }[]>;
  weaknesses?: { description: { lang: string; value: string }[] }[];
  references?: { url: string; tags?: string[] }[];
};

async function fromNvd(id: string): Promise<CveRecord | null> {
  const headers: Record<string, string> = { 'User-Agent': 'VelkryptWire/1.0' };
  if (process.env.NVD_API_KEY) headers.apiKey = process.env.NVD_API_KEY;
  const res = await fetch(`https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=${id}`, { headers, signal: AbortSignal.timeout(12000), cache: 'no-store' });
  if (!res.ok) throw new Error(`NVD ${res.status}`);
  const data = (await res.json()) as { vulnerabilities?: { cve: NvdCve }[] };
  const c = data.vulnerabilities?.[0]?.cve;
  if (!c) return null;
  const metric = c.metrics?.cvssMetricV40?.[0] ?? c.metrics?.cvssMetricV31?.[0] ?? c.metrics?.cvssMetricV30?.[0] ?? c.metrics?.cvssMetricV2?.[0];
  const sevRaw = metric?.cvssData.baseSeverity ?? metric?.baseSeverity ?? null;
  // References: vendor advisories and patches first, max 15.
  const refs = (c.references ?? []).sort((a, b) => Number((b.tags ?? []).some((t) => /Vendor Advisory|Patch/.test(t))) - Number((a.tags ?? []).some((t) => /Vendor Advisory|Patch/.test(t)))).slice(0, 15).map((r) => ({ url: r.url, tags: r.tags ?? [] }));
  return {
    id: c.id, description: c.descriptions?.find((d) => d.lang === 'en')?.value ?? null,
    cvss: metric?.cvssData.baseScore ?? null, severity: sevRaw ? sevRaw.toLowerCase() : null, vector: metric?.cvssData.vectorString ?? null,
    cwe: [...new Set((c.weaknesses ?? []).flatMap((w) => w.description.map((d) => d.value)).filter((v) => v.startsWith('CWE-')))],
    refs, published: c.published ?? null, modified: c.lastModified ?? null, fetched_at: new Date().toISOString(),
  };
}

/** CVE details: from our cache if fresh (24h), otherwise from NVD. Returns null if NVD has no such CVE. */
export async function getCve(id: string): Promise<CveRecord | null> {
  if (!CVE_RE.test(id)) return null;
  const db = createAdminClient();
  const { data: cached } = await db.from('cves').select('*').eq('id', id).maybeSingle();
  if (cached && Date.now() - new Date(cached.fetched_at).getTime() < 24 * 3600e3) return cached as CveRecord;
  try {
    const fresh = await fromNvd(id);
    if (fresh) await db.from('cves').upsert(fresh);
    return fresh ?? (cached as CveRecord | null);
  } catch {
    return (cached as CveRecord | null) ?? null; // NVD down or rate-limited: serve stale data if we have it
  }
}

export const severityOf = (cvss: number | null) => cvss === null ? 'info' : cvss >= 9 ? 'critical' : cvss >= 7 ? 'high' : cvss >= 4 ? 'medium' : 'info';
