import Notice from '@/components/Notice';
import { requireOwner } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { PROVIDERS } from '@/lib/ai/providers';
import { getAiSettings } from '@/lib/newsroom/settings';
import { runAgentNow, saveAiSettingsAction, testProviderAction } from '@/app/admin/newsroom-actions';

export const dynamic = 'force-dynamic';

export default async function AiSettings({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  await requireOwner('/admin/ai');
  const s = await getAiSettings();
  const db = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const [{ data: usage }, { data: recent }] = await Promise.all([
    db.from('ai_usage').select('*').eq('day', today),
    db.from('feed_items').select('title,source,ai_status,ai_note,created_at').neq('ai_status', 'pending').order('created_at', { ascending: false }).limit(15),
  ]);
  const used = (usage ?? []).reduce((n, u) => n + u.requests, 0);
  return (
    <>
      <div className="section-head"><h1>AI newsroom</h1><span className={`pill ${s.enabled ? 'active' : 'unsubscribed'}`}>{s.enabled ? 'Running' : 'Paused'}</span></div>
      <Notice error={sp.error} message={sp.message} />

      <form className="panel" action={saveAiSettingsAction}>
        <h3>Controls</h3>
        <label className="check" htmlFor="enabled"><input id="enabled" name="enabled" type="checkbox" defaultChecked={s.enabled} /> <b>AI newsroom on</b> (untick = kill switch: stops all AI drafting and publishing immediately)</label>
        <label className="check" htmlFor="autopublish_official"><input id="autopublish_official" name="autopublish_official" type="checkbox" defaultChecked={s.autopublish_official} /> Auto-publish official CISA exploited-flaw alerts (built from CISA data, not AI)</label>
        <label className="check" htmlFor="show_ai_label"><input id="show_ai_label" name="show_ai_label" type="checkbox" defaultChecked={s.show_ai_label} /> Show readers an &ldquo;AI-assisted&rdquo; note on stories the AI drafted (off = readers see only &ldquo;Velkrypt Wire Newsroom&rdquo; and the reviewing editor)</label>
        <div className="row">
          <label htmlFor="daily_request_limit">Max AI requests per day<input id="daily_request_limit" name="daily_request_limit" type="number" min={10} max={5000} defaultValue={s.daily_request_limit} /></label>
          <label htmlFor="min_importance">Only draft stories with importance ≥ (1-5)<input id="min_importance" name="min_importance" type="number" min={1} max={5} defaultValue={s.min_importance} /></label>
          <label htmlFor="escalation_minutes">Escalate urgent drafts after (minutes)<input id="escalation_minutes" name="escalation_minutes" type="number" min={5} max={240} defaultValue={s.escalation_minutes} /></label>
        </div>
        <div><button className="btn small" type="submit">Save</button></div>
      </form>

      <section className="panel">
        <h3>Free AI providers</h3>
        <p className="sub">Tried in this order; if one fails or hits its limit, the next takes over. Used today: <b>{used}</b> of {s.daily_request_limit} requests.</p>
        <div className="table-wrap"><table className="data">
          <thead><tr><th>Provider</th><th>Model</th><th>Key</th><th>Today</th><th></th></tr></thead>
          <tbody>{PROVIDERS.map((p) => {
            const u = usage?.find((x) => x.provider === p.id);
            return (
              <tr key={p.id}>
                <td>{p.name}</td><td><code>{p.model}</code></td>
                <td>{process.env[p.keyEnv] ? <span className="pill active">set</span> : <span className="pill pending">{p.keyEnv} missing</span>}</td>
                <td>{u ? `${u.requests} (${u.failures} failed)` : 0}</td>
                <td><form action={testProviderAction.bind(null, p.id)}><button className="btn ghost small" type="submit">Test</button></form></td>
              </tr>
            );
          })}</tbody>
        </table></div>
        <p className="sub">Change a model by setting GROQ_MODEL, CEREBRAS_MODEL or OPENROUTER_MODEL in Vercel.</p>
      </section>

      <section className="panel">
        <h3>Run now</h3>
        <p className="sub">The newsroom runs every 5 minutes on its own. Use this to test it straight away.</p>
        <form action={runAgentNow}><button className="btn small" type="submit">Run the AI newsroom now</button></form>
      </section>

      <section>
        <div className="section-head"><h2>Recent AI decisions</h2></div>
        <div className="table-wrap" style={{ marginTop: 12 }}><table className="data">
          <thead><tr><th>Item</th><th>Decision</th><th>Why</th></tr></thead>
          <tbody>{(recent ?? []).map((r, i) => <tr key={i}><td>{r.title}<br /><span className="src">{r.source}</span></td><td><span className={`pill ${r.ai_status === 'error' ? 'pending' : 'active'}`}>{r.ai_status}</span></td><td className="src">{r.ai_note}</td></tr>)}</tbody>
        </table></div>
      </section>
    </>
  );
}
