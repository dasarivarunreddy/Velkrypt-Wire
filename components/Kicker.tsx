import Link from 'next/link';
import { VERIFICATION_BADGE, categorySlug, formatDate, type Article } from '@/lib/site';

const label = (s: string) => (s === 'info' ? 'Info' : s[0].toUpperCase() + s.slice(1));

export default function Kicker({ a }: { a: Pick<Article, 'severity' | 'category' | 'published_at' | 'is_premium' | 'verification' | 'developing'> }) {
  const v = a.verification ? VERIFICATION_BADGE[a.verification] : null;
  return (
    <div className="kicker">
      <span className={`sev ${a.severity}`}>{label(a.severity)}</span>
      <Link href={`/category/${categorySlug(a.category)}`}>{a.category}</Link>
      <time dateTime={a.published_at ?? undefined}>{formatDate(a.published_at)}</time>
      {a.developing && <span className="developing">Developing</span>}
      {v && <span className="verif" title={v.help}>{v.icon} {v.label}</span>}
      {a.is_premium && <span className="premium-tag">Members</span>}
    </div>
  );
}
