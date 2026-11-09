import Link from 'next/link';
import Kicker from './Kicker';
import type { Article } from '@/lib/site';

export default function StoryCard({ a }: { a: Omit<Article, 'body_md'> }) {
  return (
    <article className="story">
      <Kicker a={a} />
      <h3><Link href={`/article/${a.slug}`}>{a.title}</Link></h3>
      <p>{a.excerpt}</p>
      {(a.cves.length > 0 || a.tags.length > 0) && (
        <div className="chips">
          {a.cves.map((c) => <Link key={c} className="chip" href={`/search?q=${encodeURIComponent(c)}`}>{c}</Link>)}
          {a.tags.slice(0, 3).map((t) => <span key={t} className="chip">{t}</span>)}
        </div>
      )}
      {a.source_name && <div className="src">{a.source_name}</div>}
    </article>
  );
}
