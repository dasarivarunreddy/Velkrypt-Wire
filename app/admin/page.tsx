import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatDate } from '@/lib/site';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const db = createAdminClient();
  const count = async (table: string, f?: (q: any) => any) => {
    let q = db.from(table).select('*', { count: 'exact', head: true });
    if (f) q = f(q);
    return (await q).count ?? 0;
  };
  const [published, drafts, feedNew, subs, users, members, comments] = await Promise.all([
    count('articles', (q) => q.eq('status', 'published')), count('articles', (q) => q.eq('status', 'draft')),
    count('feed_items', (q) => q.eq('status', 'new')), count('subscribers', (q) => q.eq('status', 'active')),
    count('profiles'), count('profiles', (q) => q.eq('is_premium', true)), count('comments'),
  ]);
  const { data: recent } = await db.from('comments').select('id,body,created_at,articles(slug,title)').order('created_at', { ascending: false }).limit(5);
  const stats = [['Published', published], ['Drafts', drafts], ['Feed to review', feedNew], ['Subscribers', subs], ['Accounts', users], ['Members', members], ['Comments', comments]] as const;
  return (
    <>
      <div className="section-head"><h1>Dashboard</h1><Link className="btn small" href="/admin/articles/new">Write a story</Link></div>
      <div className="stats">{stats.map(([l, v]) => <div className="stat" key={l}><b>{v}</b><span>{l}</span></div>)}</div>
      {feedNew > 0 && <p className="notice">{feedNew} new items from your sources are waiting. <Link href="/admin/feed">Review the feed</Link></p>}
      <section>
        <div className="section-head"><h2>Latest comments</h2></div>
        <div className="comments" style={{ marginTop: 12 }}>
          {(recent ?? []).map((c: any) => (
            <div className="comment" key={c.id}>
              <div className="meta"><span>{formatDate(c.created_at)}</span><Link href={`/article/${c.articles?.slug}`}>{c.articles?.title}</Link></div>
              <p>{c.body}</p>
            </div>
          ))}
          {!recent?.length && <p className="empty">No comments yet.</p>}
        </div>
      </section>
    </>
  );
}
