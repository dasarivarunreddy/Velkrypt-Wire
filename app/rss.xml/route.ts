import { createClient } from '@supabase/supabase-js';
import { SITE } from '@/lib/site';

export const revalidate = 600;
const x = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]!));

export async function GET() {
  let items = '';
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { data } = await supabase.from('articles').select('slug,title,excerpt,category,published_at').eq('status', 'published').order('published_at', { ascending: false }).limit(40);
    items = (data ?? []).map((a) => `<item><title>${x(a.title)}</title><link>${SITE.url}/article/${a.slug}</link><guid>${SITE.url}/article/${a.slug}</guid><category>${x(a.category)}</category><pubDate>${new Date(a.published_at).toUTCString()}</pubDate><description>${x(a.excerpt)}</description></item>`).join('');
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${x(SITE.name)}</title><link>${SITE.url}</link><description>${x(SITE.description)}</description><language>en-gb</language>${items}</channel></rss>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}
