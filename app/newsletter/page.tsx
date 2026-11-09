import type { Metadata } from 'next';
import NewsletterForm from '@/components/NewsletterForm';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatDate } from '@/lib/site';
export const metadata: Metadata = { title: 'The Weekly Wire newsletter' };
export const revalidate = 600;

export default async function Newsletter() {
  let issues: { id: string; subject: string; sent_at: string }[] = [];
  try {
    const { data } = await createAdminClient().from('newsletter_issues').select('id,subject,sent_at').order('sent_at', { ascending: false }).limit(10);
    issues = data ?? [];
  } catch { /* not configured yet */ }
  return (
    <main><div className="wrap narrow">
      <h1 className="page-title">The Weekly Wire</h1>
      <p className="lede">One email a week: the exploited vulnerabilities to patch, the breaches that matter and what to do about them. No spam, one-click unsubscribe.</p>
      <section className="panel"><h3>Subscribe</h3><NewsletterForm id="nl-page" /></section>
      {issues.length > 0 && (
        <section>
          <div className="section-head"><h2>Recent editions</h2></div>
          <ul className="list-plain" style={{ marginTop: 12 }}>{issues.map((i) => <li key={i.id}>{i.subject} <span className="src">· {formatDate(i.sent_at)}</span></li>)}</ul>
        </section>
      )}
    </div></main>
  );
}
