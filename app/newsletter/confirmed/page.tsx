import type { Metadata } from 'next';
import Link from 'next/link';
export const metadata: Metadata = { title: 'Newsletter', robots: { index: false } };
const COPY: Record<string, [string, string]> = {
  confirmed: ['You are subscribed', 'Your first Weekly Wire arrives with the next edition.'],
  unsubscribed: ['You are unsubscribed', 'You will not receive any more newsletters. You can resubscribe any time.'],
  invalid: ['That link is not valid', 'It may have expired or already been used. Subscribe again from the newsletter page.'],
};
export default async function Confirmed({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const [title, body] = COPY[(await searchParams).s || ''] ?? COPY.invalid;
  return (
    <main><div className="wrap narrow">
      <h1 className="page-title">{title}</h1><p className="lede">{body}</p>
      <div className="actions"><Link className="btn" href="/">Read the latest</Link><Link className="btn ghost" href="/newsletter">Newsletter page</Link></div>
    </div></main>
  );
}
