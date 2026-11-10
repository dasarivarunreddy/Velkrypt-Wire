import 'server-only';

export type KevEntry = {
  cveID: string;
  vendorProject: string;
  product: string;
  vulnerabilityName: string;
  dateAdded: string;
  dueDate: string;
  knownRansomwareCampaignUse: string;
  shortDescription: string;
  requiredAction?: string;
  notes?: string;
};

/** Full KEV catalog, cached 5 minutes. */
export async function getKevCatalog(): Promise<KevEntry[]> {
  try {
    const res = await fetch(KEV_URL, { next: { revalidate: 300 }, headers: { 'User-Agent': 'VelkryptWire/1.0' } });
    if (!res.ok) return [];
    return ((await res.json()) as { vulnerabilities?: KevEntry[] }).vulnerabilities ?? [];
  } catch {
    return [];
  }
}

/** FIRST EPSS: probability of exploitation in the next 30 days (free, no key). */
export async function getEpss(cves: string[]): Promise<Record<string, { epss: number; percentile: number }>> {
  if (!cves.length) return {};
  try {
    const res = await fetch(`https://api.first.org/data/v1/epss?cve=${cves.slice(0, 100).join(',')}`, { next: { revalidate: 21600 } });
    const data = (await res.json()) as { data?: { cve: string; epss: string; percentile: string }[] };
    return Object.fromEntries((data.data ?? []).map((d) => [d.cve, { epss: Number(d.epss), percentile: Number(d.percentile) }]));
  } catch {
    return {};
  }
}

export const KEV_URL = 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json';

/** Latest CISA KEV additions, cached for an hour. Returns [] if CISA is unreachable so pages never break. */
export async function getLatestKev(limit = 6): Promise<KevEntry[]> {
  try {
    const res = await fetch(KEV_URL, { next: { revalidate: 3600 }, headers: { 'User-Agent': 'VelkryptWire/1.0' } });
    if (!res.ok) return [];
    const data = (await res.json()) as { vulnerabilities?: KevEntry[] };
    return (data.vulnerabilities ?? [])
      .sort((a, b) => b.dateAdded.localeCompare(a.dateAdded) || b.cveID.localeCompare(a.cveID))
      .slice(0, limit);
  } catch {
    return [];
  }
}
