import { requireOwner } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/site';

export const dynamic = 'force-dynamic';

export default async function Audit({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireOwner('/admin/audit');
  const sp = await searchParams;
  const supabase = await createClient(); // RLS: only the owner (with 2FA) can read this table
  let q = supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(300);
  if (sp.who) q = q.ilike('actor_name', `%${sp.who.slice(0, 60)}%`);
  const { data } = await q;
  return (
    <>
      <div className="section-head"><h1>Audit log</h1><span>{data?.length ?? 0} entries</span></div>
      <p className="src">Every staff action is recorded here automatically. Staff cannot see, change or delete this log.</p>
      <form className="subscribe" action="/admin/audit" style={{ maxWidth: 420 }}>
        <label htmlFor="who" className="sr-only">Filter by person</label>
        <input id="who" name="who" defaultValue={sp.who} placeholder="Filter by staff name" />
        <button className="btn ghost" type="submit">Filter</button>
      </form>
      <div className="table-wrap"><table className="data">
        <thead><tr><th>When</th><th>Who</th><th>Action</th><th>On</th><th>Details</th></tr></thead>
        <tbody>{(data ?? []).map((a) => (
          <tr key={a.id}>
            <td style={{ whiteSpace: 'nowrap' }}>{formatDate(a.created_at)} {new Date(a.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' })}</td>
            <td>{a.actor_name || 'Unknown'}</td><td>{a.action}</td><td>{a.target}</td>
            <td><code style={{ fontFamily: 'var(--mono)', fontSize: '.75rem', wordBreak: 'break-word' }}>{Object.keys(a.details || {}).length ? JSON.stringify(a.details) : ''}</code></td>
          </tr>
        ))}</tbody>
      </table></div>
      {!data?.length && <p className="empty">Nothing recorded yet.</p>}
    </>
  );
}
