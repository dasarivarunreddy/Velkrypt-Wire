import type { Metadata } from 'next';
import Link from 'next/link';
import { CV_TIPS, HOME_LAB, INTERVIEW, UK_SCHEMES } from '@/lib/learn/careers';

export const metadata: Metadata = { title: 'Getting hired in cybersecurity (UK)', description: 'CV and LinkedIn tips, interview questions with model answers, UK schemes and bursaries, and how to build a home lab.' };

export default function Careers() {
  return (
    <main><div className="wrap narrow">
      <p className="kicker"><Link href="/learn">Learn</Link><span>Careers</span></p>
      <h1 className="page-title">Getting hired</h1>
      <p className="lede">Practical help for your first cybersecurity job in the UK: your CV, interviews, schemes worth applying to, and a home lab that proves your skills.</p>

      <section>
        <div className="section-head"><h2>CV &amp; LinkedIn</h2></div>
        <ul className="list-plain" style={{ marginTop: 12 }}>{CV_TIPS.map((t) => <li key={t}>{t}</li>)}</ul>
      </section>

      <section>
        <div className="section-head"><h2>Interview questions</h2><span>with model answers</span></div>
        {INTERVIEW.map((g) => (
          <div key={g.role} style={{ marginTop: 16 }}>
            <h3 style={{ margin: '0 0 4px' }}>{g.role}</h3>
            {g.qs.map((q) => <details className="qa" key={q.q}><summary>{q.q}</summary><p>{q.a}</p></details>)}
          </div>
        ))}
      </section>

      <section>
        <div className="section-head"><h2>UK schemes &amp; routes in</h2></div>
        <ul className="list-plain" style={{ marginTop: 12 }}>{UK_SCHEMES.map((s) => <li key={s.name}><a href={s.url} target="_blank" rel="noopener noreferrer"><b>{s.name}</b></a>: {s.what}</li>)}</ul>
        <p className="src">Opening dates change every year. Check each site, and set reminders for autumn graduate-scheme openings.</p>
      </section>

      <section>
        <div className="section-head"><h2>Build a home lab</h2></div>
        <ol className="steps" style={{ marginTop: 16 }}>
          {HOME_LAB.map((h) => <li key={h.step}><span className="n" aria-hidden="true" /><div><h3>{h.step}</h3><p>{h.detail}</p></div></li>)}
        </ol>
      </section>

      <section className="panel">
        <h3>Keep going</h3>
        <p className="sub">Follow a <Link href="/learn">roadmap</Link>, join a <Link href="/ctfs">CTF</Link>, and read the news here daily. Being able to discuss this week&apos;s incidents is one of the easiest ways to stand out in an interview.</p>
      </section>
    </div></main>
  );
}
