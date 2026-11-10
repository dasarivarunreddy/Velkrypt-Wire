import Link from 'next/link';
import { notFound } from 'next/navigation';
import ArticleForm from '@/components/ArticleForm';
import Notice from '@/components/Notice';
import { can, requireStaff } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { deleteArticle } from '@/app/admin/actions';
import { addCorrection, addUpdate, claimArticle, decideUpdate, releaseClaim } from '@/app/admin/newsroom-actions';
import { formatDate, type Article } from '@/lib/site';

export const dynamic = 'force-dynamic';
const CLAIM_MS = 30 * 60000;

export default async function EditArticle({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  const { id } = await params;
  const sp = await searchParams;
  if (id === 'new') notFound();
  const { supabase, profile, user } = await requireStaff('/admin', 'write');
  const { data } = await supabase.from('articles').select('*').eq('id', id).maybeSingle();
  if (!data) notFound();
  const a = data as Article & Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

  // Claim the draft for this editor so nobody else works on it at the same time.
  const claimFresh = a.claimed_by && a.claimed_at && Date.now() - new Date(a.claimed_at).getTime() < CLAIM_MS;
  if (a.status === 'review' && !claimFresh) {
    await createAdminClient().from('articles').update({ claimed_by: user.id, claimed_at: new Date().toISOString() }).eq('id', id);
    a.claimed_by = user.id; a.claimed_at = new Date().toISOString();
  }
  const lockedByOther = a.status === 'review' && claimFresh && a.claimed_by !== user.id;

  const db = createAdminClient();
  const [{ data: prem }, { data: updates }, { data: corrections }, { data: claimer }] = await Promise.all([
    supabase.from('article_premium').select('body_md').eq('article_id', id).maybeSingle(),
    db.from('article_updates').select('*').eq('article_id', id).neq('status', 'rejected').order('created_at', { ascending: false }),
    db.from('corrections').select('*').eq('article_id', id).order('created_at', { ascending: false }),
    a.claimed_by ? db.from('profiles').select('display_name').eq('id', a.claimed_by).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const canPublish = can(profile, 'publish');

  return (
    <>
      <div className="section-head">
        <h1>{a.status === 'review' ? 'Review story' : 'Edit story'}</h1>
        <span className="actions">
          <span className={`pill ${a.status}`}>{a.status}</span>
          <Link className="btn ghost small" href={`/article/${a.slug}`}>View page</Link>
        </span>
      </div>
      <Notice error={sp.error} message={sp.message} />

      {lockedByOther && (
        <div className="notice claim actions" style={{ justifyContent: 'space-between' }}>
          <span>🔒 <b>{claimer?.display_name || 'Another editor'}</b> is reviewing this story (since {new Date(a.claimed_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' })}). Coordinate before editing.</span>
          <form action={claimArticle.bind(null, id, true)}><button className="btn ghost small" type="submit">Take over</button></form>
        </div>
      )}
      {a.status === 'review' && !lockedByOther && (
        <div className="notice ok actions" style={{ justifyContent: 'space-between' }}>
          <span>🔒 You are reviewing this story. Others will see it as claimed for 30 minutes.</span>
          <form action={releaseClaim.bind(null, id)}><button className="btn ghost small" type="submit">Release</button></form>
        </div>
      )}
      {a.ai_generated && <p className="ai-label">🤖 Written by the AI newsroom from {a.source_name || 'its source'}. Check it against the <a href={a.source_url ?? '#'} target="_blank" rel="noopener noreferrer">original source</a> before publishing.</p>}

      <ArticleForm article={{ ...a, premium_md: prem?.body_md ?? '' }} canPublish={canPublish} />

      <section id="updates" className="panel">
        <h3>Developing story: updates timeline</h3>
        <p className="sub">Add new facts here instead of writing a separate story. Published updates show at the top of the story, newest first.</p>
        {(updates ?? []).length > 0 && (
          <ul className="timeline">
            {updates!.map((u) => (
              <li key={u.id}>
                <time>{new Date(u.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' })} · {u.status}{u.ai_generated ? ' · AI suggestion' : ''}</time>
                {u.body_md}
                {u.status === 'pending' && canPublish && (
                  <span className="actions" style={{ marginTop: 6 }}>
                    <form action={decideUpdate.bind(null, u.id, true)}><button className="btn small" type="submit">Publish</button></form>
                    <form action={decideUpdate.bind(null, u.id, false)}><button className="btn ghost small" type="submit">Reject</button></form>
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
        <form className="form" action={addUpdate.bind(null, id)}>
          <label htmlFor="update_body">New update<textarea id="update_body" name="update_body" style={{ minHeight: 80 }} placeholder="Bank confirms the attackers entered through a service provider." /></label>
          <div className="row">
            <label htmlFor="update_source_name">Source name<input id="update_source_name" name="update_source_name" /></label>
            <label htmlFor="update_source_url">Source link<input id="update_source_url" name="update_source_url" type="url" /></label>
          </div>
          <div><button className="btn small" type="submit">{canPublish ? 'Publish update' : 'Suggest update'}</button></div>
        </form>
      </section>

      {canPublish && a.status === 'published' && (
        <section className="panel">
          <h3>Corrections</h3>
          <p className="sub">Fixed a factual mistake? Say so publicly. It is shown at the bottom of the story and builds trust.</p>
          {(corrections ?? []).map((c) => <p key={c.id} className="src">{formatDate(c.created_at)}: {c.note}</p>)}
          <form className="form" action={addCorrection.bind(null, id)}>
            <label htmlFor="correction">Correction note<input id="correction" name="correction" placeholder="An earlier version said the flaw affected all versions. It affects 7.x only." /></label>
            <div><button className="btn ghost small" type="submit">Add correction</button></div>
          </form>
        </section>
      )}

      {can(profile, 'delete') && <form action={deleteArticle.bind(null, a.id)} style={{ borderTop: '1px solid var(--line)', paddingTop: 16 }}>
        <label className="check" htmlFor="confirm-del"><input id="confirm-del" type="checkbox" required /> I want to delete this story permanently</label>
        <div style={{ marginTop: 10 }}><button className="btn danger small" type="submit">Delete story</button></div>
      </form>}
    </>
  );
}
