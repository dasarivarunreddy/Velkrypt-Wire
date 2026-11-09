import type { Metadata } from 'next';
import Link from 'next/link';
import Notice from '@/components/Notice';
import { getSession, isMember } from '@/lib/auth';
import { SITE } from '@/lib/site';

export const metadata: Metadata = { title: 'Membership' };

export default async function Membership({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const { user, profile } = await getSession();
  return (
    <main><div className="wrap">
      <div>
        <h1 className="page-title">Support independent security news</h1>
        <p className="lede">{SITE.name} is free to read. Members fund the work and get deeper analysis on every major story.</p>
      </div>
      <Notice error={sp.error} message={sp.status === 'cancelled' ? 'Checkout cancelled. You have not been charged.' : undefined} />
      <div className="cards">
        <section className="panel">
          <h3>Free</h3>
          <div className="price">£0</div>
          <ul className="list-plain">
            <li>Every news story</li><li>Live KEV watch</li><li>Weekly Wire newsletter</li><li>Comments and saved stories</li>
          </ul>
          {!user && <Link className="btn ghost" href="/signup">Create free account</Link>}
        </section>
        <section className="panel" style={{ borderColor: 'var(--accent)' }}>
          <h3>Member</h3>
          <div className="price">Monthly</div>
          <p className="sub">Price shown at secure Stripe checkout. Cancel any time.</p>
          <ul className="list-plain">
            <li>Everything in Free</li><li>Members analysis: attack chains, detection ideas, hardening steps</li><li>Support an independent newsroom</li>
          </ul>
          {isMember(profile) ? <Link className="btn ghost" href="/account">You are a member</Link>
            : user ? <form action="/api/stripe/checkout" method="post"><button className="btn" type="submit">Become a member</button></form>
            : <Link className="btn" href="/signup">Create an account to join</Link>}
        </section>
      </div>
    </div></main>
  );
}
