import Link from 'next/link';
import { categorySlug, formatDate, type Article } from '@/lib/site';

const label = (s: string) => (s === 'info' ? 'Info' : s[0].toUpperCase() + s.slice(1));

export default function Kicker({ a }: { a: Pick<Article, 'severity' | 'category' | 'published_at' | 'is_premium'> }) {
  return (
    <div className="kicker">
      <span className={`sev ${a.severity}`}>{label(a.severity)}</span>
      <Link href={`/category/${categorySlug(a.category)}`}>{a.category}</Link>
      <time dateTime={a.published_at ?? undefined}>{formatDate(a.published_at)}</time>
      {a.is_premium && <span className="premium-tag">Members</span>}
    </div>
  );
}
