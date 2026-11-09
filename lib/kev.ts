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
};

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
