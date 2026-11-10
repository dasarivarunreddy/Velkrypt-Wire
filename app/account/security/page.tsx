import type { Metadata } from 'next';
import Link from 'next/link';
import TwoFactorSetup from '@/components/TwoFactorSetup';
import { requireUser } from '@/lib/auth';

export const metadata: Metadata = { title: 'Two-factor authentication', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function Security({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  await requireUser('/account/security');
  return (
    <main><div className="wrap narrow">
      <div className="section-head"><h1>Two-factor authentication</h1><Link href="/account" className="btn ghost small">Back to account</Link></div>
      <p className="lede">Add a second step to signing in: a 6-digit code from an app on your phone. Even if someone steals your password, they can&apos;t get in without your phone.</p>
      <TwoFactorSetup required={sp.required === '1'} />
    </div></main>
  );
}
