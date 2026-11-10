import Link from 'next/link';
import Notice from '@/components/Notice';
import { requireStaff } from '@/lib/auth';
import { formatDate } from '@/lib/site';

export const dynamic = 'force-dynamic';

export default async function Articles({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const { supabase } = await requireStaff('/admin', 'write');
  let q = supabase.from('articles').select('id,slug,title,category,severity,status,is_premium,is_lead,published_at,updated_at').order('updated_at', { ascending: false }).limit(200);
  if (sp.status === 'draft' || sp.status === 'published') q = q.eq('status', sp.status);
  const { data } = await q;
  return (
    <>
      <div className="section-head"><h1>Articles</h1><Link className="btn small" href="/admin/articles/new">Write a story</Link></div>
      <Notice message={sp.message} />
      <div className="actions"><Link className="btn ghost small" href="/admin/articles">All</Link><Link className="btn ghost small" href="/admin/articles?status=draft">Drafts</Link><Link className="btn ghost small" href="/admin/articles?status=published">Published</Link></div>
      <div className="table-wrap"><table className="data">
        <thead><tr><th>Headline</th><th>Status</th><th>Category</th><th>Published</th></tr></thead>
        <tbody>{(data ?? []).map((a) => (
          <tr key={a.id}>
            <td><Link href={`/admin/articles/${a.id}`}>{a.title}</Link>{a.is_lead && ' · Lead'}{a.is_premium && ' · Members'}</td>
            <td><span className={`pill ${a.status}`}>{a.status}</span></td>
            <td><span className={`sev ${a.severity}`}>{a.category}</span></td>
            <td>{formatDate(a.published_at)}</td>
          </tr>
        ))}</tbody>
      </table></div>
    </>
  );
}
