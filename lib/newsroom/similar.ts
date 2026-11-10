import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

export type Similar = { id: string; slug: string; title: string; status: string; ai_generated: boolean; created_at: string; score: number };

/** Stories from the last 3 weeks with the same CVEs, the same source link, or a very similar headline. */
export async function findSimilar(title: string, cves: string[] = [], urls: string[] = [], exclude?: string | null): Promise<Similar[]> {
  const { data } = await createAdminClient().rpc('find_similar_articles', { p_title: title, p_cves: cves, p_urls: urls, p_exclude: exclude ?? null });
  return (data ?? []) as Similar[];
}
