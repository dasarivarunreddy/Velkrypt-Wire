import Link from 'next/link';
import Notice from '@/components/Notice';
import { requireStaff } from '@/lib/auth';
import { formatDate } from '@/lib/site';
import { dismissFeedItem, fetchFeedNow } from '@/app/admin/actions';

export const dynamic = 'force-dynamic';

export default async function Feed({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const { supabase } = await requireStaff('/admin', 'feed');
  const { data } = await supabase.from('feed_items').select('*').eq('status', 'new').order('published_at', { ascending: false, nullsFirst: false }).limit(100);
  return (
    <>
      <div className="section-head"><h1>News feed</h1><span>{data?.length ?? 0} to review</span></div>
      <p className="src">New items from your <a href="/admin/sources">news sources</a> and CISA KEV arrive automatically. The AI newsroom drafts the important ones; anything it skipped is still here for you.</p>
      <Notice message={sp.message} />
      <form action={fetchFeedNow}><button className="btn small" type="submit">Check sources now</button></form>
      <div className="grid">
        {(data ?? []).map((f) => (
          <article className="story" key={f.id}>
            <div className="kicker"><span>{f.source}</span><span>{formatDate(f.published_at)}</span></div>
            <h3><a href={f.url} target="_blank" rel="noopener noreferrer nofollow">{f.title}</a></h3>
            {f.summary && <p>{f.summary}</p>}
            {f.cves.length > 0 && <div className="chips">{f.cves.map((c: string) => <span key={c} className="chip">{c}</span>)}</div>}
            <div className="actions">
              <Link className="btn small" href={`/admin/articles/new?feed=${f.id}`}>Write story</Link>
              <form action={dismissFeedItem.bind(null, f.id)}><button className="btn ghost small" type="submit">Dismiss</button></form>
            </div>
          </article>
        ))}
      </div>
      {!data?.length && <p className="empty">Nothing waiting. Press “Check sources now” to pull the latest.</p>}
    </>
  );
}
