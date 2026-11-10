import 'server-only';
import { getEpss, getKevCatalog, type KevEntry } from '@/lib/kev';
import { createClient } from '@supabase/supabase-js';

const EDGE = /vpn|firewall|gateway|router|switch|fortios|pan-os|connect secure|asa|ftd|sonicos|netscaler|citrix|big-ip|ivanti|edge/i;

export type ThreatLevel = { level: 'Guarded' | 'Elevated' | 'High' | 'Severe'; kev7: number; ransomware7: number; edge7: number; critical7: number; summary: string };

/** A simple, explainable threat level from the last 7 days of exploited flaws and critical stories. */
export async function getThreatLevel(): Promise<ThreatLevel> {
  const kev = await getKevCatalog();
  const since = Date.now() - 7 * 864e5;
  const recent = kev.filter((k) => new Date(k.dateAdded).getTime() >= since);
  const ransomware7 = recent.filter((k) => k.knownRansomwareCampaignUse === 'Known').length;
  const edge7 = recent.filter((k) => EDGE.test(`${k.vendorProject} ${k.product}`)).length;
  let critical7 = 0;
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { count } = await sb.from('articles').select('id', { count: 'exact', head: true }).eq('status', 'published').eq('severity', 'critical').gte('published_at', new Date(since).toISOString());
    critical7 = count ?? 0;
  }
  const score = recent.length + 2 * ransomware7 + edge7 + critical7;
  const level = score >= 16 ? 'Severe' : score >= 9 ? 'High' : score >= 4 ? 'Elevated' : 'Guarded';
  const parts = [`${recent.length} exploited flaw${recent.length === 1 ? '' : 's'} added this week`];
  if (edge7) parts.push(`${edge7} in internet-facing devices`);
  if (ransomware7) parts.push(`${ransomware7} used by ransomware`);
  return { level, kev7: recent.length, ransomware7, edge7, critical7, summary: parts.join(', ') + '.' };
}

export type Priority = KevEntry & { epss?: number; score: number; edge: boolean };

/** What to patch first: recent KEV entries ranked by ransomware use, exploit likelihood and exposure. */
export async function getPatchPriority(days = 30, limit = 15): Promise<Priority[]> {
  const since = Date.now() - days * 864e5;
  const recent = (await getKevCatalog()).filter((k) => new Date(k.dateAdded).getTime() >= since);
  const epss = await getEpss(recent.map((k) => k.cveID));
  return recent.map((k) => {
    const e = epss[k.cveID]?.epss;
    const edge = EDGE.test(`${k.vendorProject} ${k.product}`);
    const ageDays = (Date.now() - new Date(k.dateAdded).getTime()) / 864e5;
    const score = (k.knownRansomwareCampaignUse === 'Known' ? 3 : 0) + (e ?? 0.1) * 4 + (edge ? 2 : 0) + Math.max(0, 1 - ageDays / days);
    return { ...k, epss: e, score, edge };
  }).sort((a, b) => b.score - a.score).slice(0, limit);
}
