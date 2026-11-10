import type { Metadata } from 'next';
import StoryCard from '@/components/StoryCard';
import { createClient } from '@/lib/supabase/server';
import { LIST_COLUMNS, type Article } from '@/lib/site';

export const metadata: Metadata = { title: 'Search', robots: { index: false } };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q || '').trim().slice(0, 100);
  let list: Article[] = [];
  if (q) {
    const supabase = await createClient();
    const base = supabase.from('articles').select(LIST_COLUMNS).eq('status', 'published').order('published_at', { ascending: false }).limit(50);
    const cve = q.toUpperCase().match(/^CVE-\d{4}-\d{4,}$/);
    const { data } = cve ? await base.contains('cves', [cve[0]]) : await base.textSearch('search', q, { type: 'websearch', config: 'english' });
    list = (data ?? []) as unknown as Article[];
  }
  return (
    <main><div className="wrap">
      <form action="/search" role="search" className="subscribe" style={{ maxWidth: 560 }}>
        <label htmlFor="sq" className="sr-only">Search stories</label>
        <input id="sq" name="q" type="search" defaultValue={q} placeholder="CVE-2026-19868, ransomware, Ivanti…" />
        <button className="btn" type="submit">Search</button>
      </form>
      <section>
        <div className="section-head"><h1>{q ? `Results for “${q}”` : 'Search'}</h1><span>{q ? `${list.length} found` : ''}</span></div>
        {q && !list.length && <p className="empty">No stories match. Try a vendor name, a CVE number or a broader word.</p>}
        <div className="grid">{list.map((a) => <StoryCard key={a.id} a={a} />)}</div>
      </section>
    </div></main>
  );
}
