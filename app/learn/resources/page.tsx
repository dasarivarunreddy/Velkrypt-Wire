import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { RESOURCES, TOPIC_LABEL, type Level, type Topic } from '@/lib/learn/resources';
import { formatDate } from '@/lib/site';

export const metadata: Metadata = { title: 'Free cybersecurity courses and labs', description: 'Curated free cybersecurity courses, labs and CTF practice, filtered by level and topic. Links re-checked weekly.' };
export const revalidate = 3600;
const LEVELS: Level[] = ['beginner', 'intermediate', 'advanced'];

export default async function Resources({ searchParams }: { searchParams: Promise<{ level?: string; topic?: string }> }) {
  const sp = await searchParams;
  const level = LEVELS.includes(sp.level as Level) ? (sp.level as Level) : undefined;
  const topic = sp.topic && sp.topic in TOPIC_LABEL ? (sp.topic as Topic) : undefined;
  const list = RESOURCES.filter((r) => (!level || r.level === level) && (!topic || r.topics.includes(topic)));
  const { data: checks } = await (await createClient()).from('link_checks').select('url,ok,checked_at');
  const check = new Map((checks ?? []).map((c) => [c.url, c]));
  const href = (l?: string, t?: string) => `/learn/resources?${new URLSearchParams({ ...(l ? { level: l } : {}), ...(t ? { topic: t } : {}) })}`;
  return (
    <main><div className="wrap">
      <p className="kicker"><Link href="/learn">Learn</Link><span>Free resources</span></p>
      <h1 className="page-title">Free courses &amp; labs</h1>
      <p className="lede">Hand-picked, free to start, and checked weekly. &ldquo;Free&rdquo; notes tell you exactly what is free and what is not.</p>
      <div className="filters-bar"><b className="src">Level:</b> <a href={href(undefined, topic)} aria-current={!level}>All</a>{LEVELS.map((l) => <a key={l} href={href(l, topic)} aria-current={level === l}>{l}</a>)}</div>
      <div className="filters-bar"><b className="src">Topic:</b> <a href={href(level)} aria-current={!topic}>All</a>{(Object.keys(TOPIC_LABEL) as Topic[]).map((t) => <a key={t} href={href(level, t)} aria-current={topic === t}>{TOPIC_LABEL[t]}</a>)}</div>
      <div className="grid">
        {list.map((r) => {
          const c = check.get(r.url);
          if (c && !c.ok) return null; // hide links that failed their last check
          return (
            <article className="story" key={r.id}>
              <div className="kicker"><span>{r.kind}</span><span>{r.level}</span><span>{r.provider}</span></div>
              <h3><a href={r.url} target="_blank" rel="noopener noreferrer">{r.title} ↗</a></h3>
              <p>{r.description}</p>
              <div className="chips">{r.topics.map((t) => <span key={t} className="chip">{TOPIC_LABEL[t]}</span>)}</div>
              <div className="src">💷 {r.free}{c ? ` · link checked ${formatDate(c.checked_at)}` : ''}</div>
            </article>
          );
        })}
      </div>
      {!list.length && <p className="empty">Nothing matches that filter yet.</p>}
    </div></main>
  );
}
