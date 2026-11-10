import { createClient } from '@supabase/supabase-js';
import { ogCard, OG_SIZE } from '@/lib/og';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Velkrypt Wire story';

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let title = 'Velkrypt Wire', kicker = 'News', severity = 'info', footer: string | undefined;
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { data } = await sb.from('articles').select('title,category,severity,cves').eq('slug', slug).eq('status', 'published').maybeSingle();
    if (data) { title = data.title; kicker = `${data.severity} · ${data.category}`; severity = data.severity; if (data.cves?.length) footer = `${data.cves.slice(0, 2).join(' · ')} · velkrypt.online`; }
  }
  return ogCard({ kicker, title, severity, footer });
}
