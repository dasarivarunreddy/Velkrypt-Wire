import Notice from '@/components/Notice';
import { requireStaff } from '@/lib/auth';
import { deleteCtf, saveCtf } from '@/app/learn/actions';

export const dynamic = 'force-dynamic';

export default async function AdminCtfs({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const { supabase } = await requireStaff('/admin/ctfs', 'learn');
  const { data } = await supabase.from('ctf_events').select('id,name,starts_at,level').gte('ends_at', new Date().toISOString()).order('starts_at');
  return (
    <>
      <div className="section-head"><h1>CTF calendar</h1><a className="btn ghost small" href="/ctfs">View public page</a></div>
      <Notice error={sp.error} message={sp.message} />
      <p className="src">Find events on <a href="https://ctftime.org/event/list/upcoming" target="_blank" rel="noopener noreferrer">CTFtime</a> or organisers&apos; sites, and add the ones worth recommending. Always link the official event page. Times are UK time.</p>
      <form className="form panel" action={saveCtf}>
        <div className="row">
          <label htmlFor="name">Event name<input id="name" name="name" required maxLength={120} /></label>
          <label htmlFor="url">Official event link<input id="url" name="url" type="url" required /></label>
          <label htmlFor="ctftime_url">CTFtime link (optional)<input id="ctftime_url" name="ctftime_url" type="url" /></label>
        </div>
        <div className="row">
          <label htmlFor="starts_at">Starts<input id="starts_at" name="starts_at" type="datetime-local" required /></label>
          <label htmlFor="ends_at">Ends<input id="ends_at" name="ends_at" type="datetime-local" required /></label>
          <label htmlFor="format">Format<select id="format" name="format"><option>Jeopardy</option><option>Attack-Defence</option><option>Mixed</option><option>King of the Hill</option><option>Other</option></select></label>
          <label htmlFor="level">Level<select id="level" name="level"><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></label>
          <label htmlFor="location">Location<input id="location" name="location" defaultValue="Online" /></label>
        </div>
        <label htmlFor="note">Why we recommend it (optional)<input id="note" name="note" maxLength={500} placeholder="Great first CTF: easy web and forensics challenges, teams of up to 4." /></label>
        <div className="actions">
          <label className="check" htmlFor="student_friendly"><input id="student_friendly" name="student_friendly" type="checkbox" /> Student-friendly</label>
          <label className="check" htmlFor="uk"><input id="uk" name="uk" type="checkbox" /> UK event</label>
        </div>
        <div><button className="btn small" type="submit">Add event</button></div>
      </form>
      <div className="table-wrap"><table className="data">
        <thead><tr><th>Event</th><th>Starts</th><th>Level</th><th></th></tr></thead>
        <tbody>{(data ?? []).map((e) => (
          <tr key={e.id}><td>{e.name}</td><td>{new Date(e.starts_at).toLocaleString('en-GB', { timeZone: 'Europe/London' })}</td><td>{e.level}</td>
            <td><form action={deleteCtf.bind(null, e.id)}><button className="btn ghost small" type="submit">Remove</button></form></td></tr>
        ))}</tbody>
      </table></div>
    </>
  );
}
