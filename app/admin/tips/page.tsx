import { requireStaff } from '@/lib/auth';
import { setTipStatus } from '@/app/admin/newsroom-actions';
import { formatDate } from '@/lib/site';

export const dynamic = 'force-dynamic';

export default async function Tips({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const { supabase } = await requireStaff('/admin/tips', 'tips');
  const show = sp.show === 'archived' ? 'archived' : 'inbox';
  let q = supabase.from('tips').select('*').order('created_at', { ascending: false }).limit(100);
  q = show === 'archived' ? q.eq('status', 'archived') : q.neq('status', 'archived');
  const { data } = await q;
  return (
    <>
      <div className="section-head"><h1>Reader tips</h1><span><a href="/admin/tips">Inbox</a> · <a href="/admin/tips?show=archived">Archived</a></span></div>
      <p className="src">Treat tips as leads, not facts. Verify independently before reporting, and never reveal who sent a tip.</p>
      {(data ?? []).map((t) => (
        <div className="panel" key={t.id}>
          <div className="kicker"><span className={`pill ${t.status === 'new' ? 'new' : 'active'}`}>{t.status}</span><span>{formatDate(t.created_at)}</span></div>
          <p style={{ margin: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{t.message}</p>
          {t.link && <p className="src">Link: <a href={t.link} target="_blank" rel="noopener noreferrer nofollow">{t.link}</a></p>}
          {t.contact && <p className="src">Contact: {t.contact}</p>}
          <div className="actions">
            {t.status === 'new' && <form action={setTipStatus.bind(null, t.id, 'read')}><button className="btn ghost small" type="submit">Mark read</button></form>}
            {t.status !== 'archived' && <form action={setTipStatus.bind(null, t.id, 'archived')}><button className="btn ghost small" type="submit">Archive</button></form>}
          </div>
        </div>
      ))}
      {!data?.length && <p className="empty">No tips here.</p>}
    </>
  );
}
