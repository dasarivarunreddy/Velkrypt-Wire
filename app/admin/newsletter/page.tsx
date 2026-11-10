import Notice from '@/components/Notice';
import { requireStaff } from '@/lib/auth';
import { formatDate } from '@/lib/site';
import { sendNewsletter } from './actions';

export const dynamic = 'force-dynamic';

export default async function NewsletterAdmin({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const { supabase } = await requireStaff('/admin', 'newsletter');
  const [{ count }, { data: issues }] = await Promise.all([
    supabase.from('subscribers').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('newsletter_issues').select('id,subject,recipients,sent_at').order('sent_at', { ascending: false }).limit(20),
  ]);
  return (
    <>
      <div className="section-head"><h1>Newsletter</h1><span>{count ?? 0} active subscribers</span></div>
      <Notice error={sp.error} message={sp.message} />
      <form className="form" action={sendNewsletter}>
        <label htmlFor="subject">Subject line<input id="subject" name="subject" required maxLength={150} placeholder="Weekly Wire: OpenSSH under attack, SonicWall MFA bypass" /></label>
        <label htmlFor="intro">Intro (Markdown)<textarea id="intro" name="intro" className="code" style={{ minHeight: 200 }} placeholder={'Hi,\n\nThis week attackers moved fast...'} /></label>
        <label className="check" htmlFor="include_stories"><input id="include_stories" name="include_stories" type="checkbox" defaultChecked /> Add this week&apos;s published stories automatically</label>
        <div className="actions">
          <button className="btn ghost" type="submit" name="mode" value="test">Send me a test</button>
        </div>
        <div className="panel">
          <label className="check" htmlFor="confirm"><input id="confirm" name="confirm" type="checkbox" /> I checked the test email and want to send to all {count ?? 0} subscribers</label>
          <div><button className="btn" type="submit" name="mode" value="all">Send to all subscribers</button></div>
        </div>
      </form>
      <section>
        <div className="section-head"><h2>Sent editions</h2></div>
        <div className="table-wrap" style={{ marginTop: 12 }}><table className="data">
          <thead><tr><th>Subject</th><th>Recipients</th><th>Sent</th></tr></thead>
          <tbody>{(issues ?? []).map((i) => <tr key={i.id}><td>{i.subject}</td><td>{i.recipients}</td><td>{formatDate(i.sent_at)}</td></tr>)}</tbody>
        </table></div>
      </section>
    </>
  );
}
