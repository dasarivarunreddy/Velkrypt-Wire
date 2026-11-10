import type { Metadata } from 'next';
import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { ROADMAPS } from '@/lib/learn/roadmaps';
import { RESOURCES } from '@/lib/learn/resources';

export const metadata: Metadata = {
  title: 'Learn cybersecurity: free roadmaps and resources',
  description: 'Free, step-by-step roadmaps into cybersecurity careers (SOC analyst, penetration tester, cloud security, GRC, DFIR), with curated free courses and labs.',
};

export default async function Learn() {
  const { supabase, user } = await getSession();
  const { data: progress } = user ? await supabase.from('user_progress').select('item').eq('user_id', user.id) : { data: [] };
  const done = new Set((progress ?? []).map((p) => p.item));
  return (
    <main><div className="wrap">
      <section className="hub-hero">
        <p className="kicker"><span>Learn &amp; Careers</span><span>{RESOURCES.length} free resources</span></p>
        <h1 className="page-title">Get into cybersecurity, for free</h1>
        <p className="lede">Pick a role, follow the steps in order, and tick them off as you go. Every resource here is free to start, and every link is re-checked weekly.</p>
        <div className="actions">
          <Link className="btn" href="/learn/resources">Browse free resources</Link>
          <Link className="btn ghost" href="/learn/certifications">Which certifications?</Link>
          <Link className="btn ghost" href="/ctfs">Upcoming CTFs</Link>
          <Link className="btn ghost" href="/careers">Getting hired</Link>
        </div>
      </section>
      <section>
        <div className="section-head"><h2>Career roadmaps</h2><span>{user ? 'Your progress is saved' : 'Sign in to save progress'}</span></div>
        <div className="road-grid" style={{ marginTop: 16 }}>
          {ROADMAPS.map((r) => {
            const n = r.steps.filter((s) => done.has(s.id)).length;
            return (
              <Link key={r.slug} className="road-card" href={`/learn/roadmaps/${r.slug}`}>
                <h3>{r.title}</h3>
                <p>{r.short}</p>
                <div className="progress" aria-label={`${n} of ${r.steps.length} steps done`}><span style={{ width: `${(n / r.steps.length) * 100}%` }} /></div>
                <span className="src">{n}/{r.steps.length} steps{n === r.steps.length ? ' · complete 🎉' : ''}</span>
              </Link>
            );
          })}
        </div>
      </section>
      <section className="panel">
        <h3>New to all this?</h3>
        <p className="sub">Start with the <Link href="/learn/glossary">plain-English glossary</Link>, then the SOC Analyst roadmap: it is the most common first job in cyber. Every news story on this site also has a &ldquo;Learn this&rdquo; box linking the headline to a free lab.</p>
      </section>
    </div></main>
  );
}
