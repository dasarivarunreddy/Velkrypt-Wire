import Link from 'next/link';
import Notice from '@/components/Notice';
import { can, requireStaff } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { decideUpdate } from '@/app/admin/newsroom-actions';

export const dynamic = 'force-dynamic';
type Check = { ok: boolean };
const ago = (d: string) => { const m = Math.round((Date.now() - new Date(d).getTime()) / 60000); return m < 60 ? `${m} min` : m < 1440 ? `${Math.round(m / 60)} h` : `${Math.round(m / 1440)} d`; };

export default async function Review({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const { supabase, profile } = await requireStaff('/admin/review', 'write');
  const db = createAdminClient();
  const [{ data: drafts }, { data: scheduled }, { data: updates }, { data: names }] = await Promise.all([
    supabase.from('articles').select('id,title,priority,ai_generated,ai_checks,claimed_by,claimed_at,created_at,author_id,verification').eq('status', 'review').order('created_at', { ascending: false }).limit(100),
    supabase.from('articles').select('id,title,scheduled_for').eq('status', 'scheduled').order('scheduled_for').limit(50),
    db.from('article_updates').select('id,body_md,source_name,source_url,ai_generated,created_at,article_id,articles(title,slug)').eq('status', 'pending').order('created_at', { ascending: false }).limit(50),
    db.from('profiles').select('id,display_name').in('role', ['writer', 'editor', 'admin', 'owner']),
  ]);
  const nameOf = (id: string | null) => names?.find((n) => n.id === id)?.display_name ?? 'someone';
  const order = { breaking: 0, high: 1, normal: 2 } as Record<string, number>;
  const sorted = (drafts ?? []).sort((a, b) => order[a.priority] - order[b.priority]);
  return (
    <>
      <div className="section-head"><h1>Review queue</h1><span>{sorted.length} drafts · {updates?.length ?? 0} updates</span></div>
      <Notice error={sp.error} message={sp.message} />
      <div className="table-wrap"><table className="data">
        <thead><tr><th>Story</th><th>From</th><th>Self-check</th><th>Waiting</th><th>Status</th></tr></thead>
        <tbody>{sorted.map((d) => {
          const checks = (d.ai_checks ?? []) as Check[];
          const claimed = d.claimed_by && d.claimed_at && Date.now() - new Date(d.claimed_at).getTime() < 30 * 60000;
          return (
            <tr key={d.id}>
              <td>{d.priority === 'breaking' ? '🔴 ' : d.priority === 'high' ? '🟠 ' : ''}<Link href={`/admin/articles/${d.id}`}><b>{d.title}</b></Link></td>
              <td>{d.ai_generated ? '🤖 AI' : nameOf(d.author_id)}</td>
              <td>{checks.length ? `${checks.filter((c) => c.ok).length}/${checks.length}` : '—'}</td>
              <td>{ago(d.created_at)}</td>
              <td>{claimed ? <span className="pill draft">🔒 {nameOf(d.claimed_by)}</span> : <span className="pill new">Unclaimed</span>}</td>
            </tr>
          );
        })}</tbody>
      </table></div>
      {!sorted.length && <p className="empty">Nothing waiting. Nice.</p>}

      <section id="updates" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="section-head"><h2>Suggested updates to existing stories</h2></div>
        {(updates ?? []).map((u) => {
          const art = u.articles as unknown as { title: string; slug: string } | null;
          return (
            <div className="panel" key={u.id}>
              <div className="kicker"><span>{u.ai_generated ? '🤖 AI suggestion' : 'Staff suggestion'}</span><span>{ago(u.created_at)} ago</span></div>
              <p style={{ margin: 0 }}>For: <Link href={`/admin/articles/${u.article_id}`}><b>{art?.title}</b></Link></p>
              <p style={{ margin: 0 }}>{u.body_md}</p>
              {u.source_url && <p className="src">Source: <a href={u.source_url} target="_blank" rel="noopener noreferrer">{u.source_name || u.source_url}</a></p>}
              {can(profile, 'publish') && (
                <div className="actions">
                  <form action={decideUpdate.bind(null, u.id, true)}><button className="btn small" type="submit">Publish update</button></form>
                  <form action={decideUpdate.bind(null, u.id, false)}><button className="btn ghost small" type="submit">Reject</button></form>
                </div>
              )}
            </div>
          );
        })}
        {!updates?.length && <p className="empty">No suggested updates.</p>}
      </section>

      {!!scheduled?.length && (
        <section>
          <div className="section-head"><h2>Scheduled</h2></div>
          <ul className="list-plain" style={{ marginTop: 12 }}>{scheduled.map((s) => <li key={s.id}><Link href={`/admin/articles/${s.id}`}>{s.title}</Link> <span className="src">· {new Date(s.scheduled_for).toLocaleString('en-GB', { timeZone: 'Europe/London' })}</span></li>)}</ul>
        </section>
      )}
    </>
  );
}
