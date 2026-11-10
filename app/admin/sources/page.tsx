import Notice from '@/components/Notice';
import { isOwner, requireStaff } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatDate } from '@/lib/site';
import { addSource, deleteSource, testSourceAction, toggleSource } from './actions';

export const dynamic = 'force-dynamic';
const GROUPS = ['government', 'vendor', 'news', 'research'] as const;
const LABEL = { government: 'Government CERTs & agencies', vendor: 'Vendor advisories', news: 'News outlets', research: 'Researchers & blogs' };

export default async function Sources({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const { profile } = await requireStaff('/admin/sources', 'feed');
  const owner = isOwner(profile);
  const { data } = await createAdminClient().from('feed_sources').select('*').order('category').order('name');
  return (
    <>
      <div className="section-head"><h1>News sources</h1><span>{data?.filter((s) => s.enabled).length ?? 0} active</span></div>
      <p className="src">The AI newsroom checks every active source every 5 minutes. Primary sources (government CERTs and vendors) are preferred over news outlets. Use <b>Test</b> to check a source still works.</p>
      <Notice error={sp.error} message={sp.message} />
      {GROUPS.map((g) => {
        const list = (data ?? []).filter((s) => s.category === g);
        if (!list.length) return null;
        return (
          <section key={g}>
            <div className="section-head"><h2>{LABEL[g]}</h2><span>{list.length}</span></div>
            <div className="table-wrap" style={{ marginTop: 12 }}><table className="data">
              <thead><tr><th>Source</th><th>Status</th><th>Last working</th><th></th></tr></thead>
              <tbody>{list.map((s) => (
                <tr key={s.id} style={{ opacity: s.enabled ? 1 : 0.55 }}>
                  <td><b>{s.name}</b>{s.region && <span className="src"> · {s.region}</span>}<br /><span className="src" style={{ overflowWrap: 'anywhere' }}>{s.kind === 'page' ? `Page reader (${s.link_match})` : 'RSS'} · {s.url}</span></td>
                  <td>{!s.enabled ? <span className="pill unsubscribed">off</span> : s.last_error ? <span className="pill pending" title={s.last_error}>error</span> : s.last_ok ? <span className="pill active">ok</span> : <span className="pill new">not checked</span>}
                    {s.last_error && <><br /><span className="src">{s.last_error.slice(0, 120)}</span></>}</td>
                  <td>{s.last_ok ? formatDate(s.last_ok) : '—'}</td>
                  <td><div className="actions">
                    <form action={testSourceAction.bind(null, s.id)}><button className="btn ghost small" type="submit">Test</button></form>
                    {owner && <form action={toggleSource.bind(null, s.id, !s.enabled)}><button className="btn ghost small" type="submit">{s.enabled ? 'Turn off' : 'Turn on'}</button></form>}
                    {owner && <form action={deleteSource.bind(null, s.id)}><button className="btn ghost small" type="submit">Remove</button></form>}
                  </div></td>
                </tr>
              ))}</tbody>
            </table></div>
          </section>
        );
      })}
      {!data?.length && <p className="notice err">No sources yet. Run <code>supabase/sources.sql</code> in Supabase to add the starter list.</p>}
      {owner && (
        <form className="panel form" action={addSource}>
          <h3>Add a source</h3>
          <div className="row">
            <label htmlFor="name">Name<input id="name" name="name" required maxLength={80} placeholder="Palo Alto Networks advisories" /></label>
            <label htmlFor="url">Link (https)<input id="url" name="url" type="url" required /></label>
          </div>
          <div className="row">
            <label htmlFor="kind">Type<select id="kind" name="kind"><option value="rss">RSS / Atom feed</option><option value="page">Web page with a list of advisories</option></select></label>
            <label htmlFor="link_match">Link pattern (page type only)<input id="link_match" name="link_match" placeholder="CIVN-|CIAD-" /></label>
            <label htmlFor="category">Kind of source<select id="category" name="category"><option value="government">Government / CERT</option><option value="vendor">Vendor</option><option value="news">News outlet</option><option value="research">Researcher / blog</option></select></label>
            <label htmlFor="region">Region (optional)<input id="region" name="region" maxLength={10} placeholder="IN, UK, US…" /></label>
          </div>
          <p className="sub">Look for an RSS icon or &ldquo;feed&rdquo; link on the source&apos;s site. If there is none, choose &ldquo;Web page&rdquo; and give a pattern that appears in each advisory&apos;s link or title.</p>
          <div><button className="btn small" type="submit">Add and test</button></div>
        </form>
      )}
    </>
  );
}
