import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { roadmapBySlug, ROADMAPS } from '@/lib/learn/roadmaps';
import { byId } from '@/lib/learn/resources';
import { toggleStep } from '@/app/learn/actions';

type Props = { params: Promise<{ slug: string }> };
export function generateStaticParams() { return ROADMAPS.map((r) => ({ slug: r.slug })); }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const r = roadmapBySlug((await params).slug);
  return r ? { title: `How to become a ${r.title} (UK, free roadmap)`, description: r.short } : { title: 'Roadmap' };
}

export default async function RoadmapPage({ params }: Props) {
  const r = roadmapBySlug((await params).slug);
  if (!r) notFound();
  const path = `/learn/roadmaps/${r.slug}`;
  const { supabase, user } = await getSession();
  const { data: progress } = user ? await supabase.from('user_progress').select('item').eq('user_id', user.id) : { data: [] };
  const done = new Set((progress ?? []).map((p) => p.item));
  const n = r.steps.filter((s) => done.has(s.id)).length;
  return (
    <main><div className="wrap narrow">
      <p className="kicker"><Link href="/learn">Learn</Link><span>Roadmap</span></p>
      <h1 className="page-title">{r.title}</h1>
      <p className="lede">{r.short}</p>
      <div>
        <div className="progress"><span style={{ width: `${(n / r.steps.length) * 100}%` }} /></div>
        <p className="src">{user ? `${n} of ${r.steps.length} steps done` : <><Link href={`/login?next=${path}`}>Sign in</Link> to track your progress.</>}</p>
      </div>

      <section className="cards">
        <div className="panel"><h3>Day to day</h3><ul className="list-plain">{r.dayToDay.map((d) => <li key={d}>{d}</li>)}</ul></div>
        <div className="panel"><h3>Core skills</h3><ul className="list-plain">{r.skills.map((d) => <li key={d}>{d}</li>)}</ul></div>
      </section>

      <section>
        <div className="section-head"><h2>Steps</h2><span>In order</span></div>
        <ol className="steps" style={{ marginTop: 16 }}>
          {r.steps.map((s) => (
            <li key={s.id} className={done.has(s.id) ? 'done' : ''}>
              <span className="n" aria-hidden="true" />
              <div><h3>{s.title}</h3><p>{s.detail}</p></div>
              <form action={toggleStep.bind(null, s.id, path)}><button className={`btn small${done.has(s.id) ? '' : ' ghost'}`} type="submit">{done.has(s.id) ? '✓ Done' : 'Mark done'}</button></form>
              {s.resources.length > 0 && (
                <div className="res-links">{s.resources.map((id) => { const x = byId(id); return x ? <a key={id} className="chip" href={x.url} target="_blank" rel="noopener noreferrer">{x.provider}: {x.title} ↗</a> : null; })}</div>
              )}
            </li>
          ))}
        </ol>
      </section>

      <section className="panel">
        <h3>Certifications to consider</h3>
        <ul className="list-plain">{r.certs.map((c) => <li key={c.name}><b>{c.name}</b>: {c.note}</li>)}</ul>
        <p className="sub">See the <Link href="/learn/certifications">certification guide</Link> for an honest comparison. For current UK salaries, check <a href={r.itjobswatch} target="_blank" rel="noopener noreferrer">live job-market data on ITJobsWatch</a>.</p>
      </section>
    </div></main>
  );
}
