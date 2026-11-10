import Link from 'next/link';
import Kicker from '@/components/Kicker';
import StoryCard from '@/components/StoryCard';
import KevPanel from '@/components/KevPanel';
import ThreatLevel from '@/components/ThreatLevel';
import Ticker from '@/components/Ticker';
import NewsletterForm from '@/components/NewsletterForm';
import { createClient } from '@/lib/supabase/server';
import { LIST_COLUMNS, type Article } from '@/lib/site';
import SetupNotice from '@/components/SetupNotice';

export const revalidate = 300;
const PER_PAGE = 18;

export default async function Home({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return <SetupNotice />;
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const supabase = await createClient();

  const { data: leadRows } = await supabase.from('articles').select(LIST_COLUMNS)
    .eq('status', 'published').eq('is_lead', true).order('published_at', { ascending: false }).limit(1);
  const { data: rows, count } = await supabase.from('articles').select(LIST_COLUMNS, { count: 'exact' })
    .eq('status', 'published').order('published_at', { ascending: false })
    .range((page - 1) * PER_PAGE, page * PER_PAGE);

  const all = (rows ?? []) as unknown as Article[];
  const lead = ((leadRows ?? [])[0] as unknown as Article | undefined) ?? (page === 1 ? all[0] : undefined);
  const list = all.filter((a) => page > 1 || a.id !== lead?.id).slice(0, PER_PAGE);
  const hasMore = (count ?? 0) > page * PER_PAGE;

  return (
    <>
      <Ticker />
      <main>
        <div className="wrap">
          {page === 1 && (
            <section className="front">
              {lead ? (
                <article className={`lead ${lead.severity}`}>
                  <Kicker a={lead} />
                  <h2><Link href={`/article/${lead.slug}`}>{lead.title}</Link></h2>
                  <p>{lead.excerpt}</p>
                  <div className="chips">{lead.cves.concat(lead.tags).map((t) => <span key={t} className="chip">{t}</span>)}</div>
                  <div className="actions"><Link className="btn" href={`/article/${lead.slug}`}>Read the story</Link>
                    {lead.source_url && <span className="src">Source: <a href={lead.source_url} target="_blank" rel="noopener noreferrer">{lead.source_name}</a></span>}</div>
                </article>
              ) : <p className="empty">No stories published yet. Write one from the admin panel.</p>}
              <aside className="rail"><ThreatLevel /><KevPanel /></aside>
            </section>
          )}
          <section aria-labelledby="latest-h">
            <div className="section-head"><h2 id="latest-h">{page === 1 ? 'Latest' : `Latest · page ${page}`}</h2><span>{count ?? 0} stories</span></div>
            <div className="grid">{list.map((a) => <StoryCard key={a.id} a={a} />)}</div>
            <div className="pager" style={{ marginTop: 20 }}>
              {page > 1 ? <Link className="btn ghost" href={page === 2 ? '/' : `/?page=${page - 1}`}>Newer stories</Link> : <span />}
              {hasMore && <Link className="btn ghost" href={`/?page=${page + 1}`}>Older stories</Link>}
            </div>
          </section>
        </div>
      </main>
      <section className="band" aria-labelledby="band-h">
        <div className="wrap">
          <div><h2 id="band-h">The Weekly Wire</h2><p>One email every week: the exploited vulnerabilities to patch, the breaches that matter and what to do about them.</p></div>
          <NewsletterForm id="band-email" />
        </div>
      </section>
    </>
  );
}
