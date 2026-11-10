import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import MfaChallenge from '@/components/MfaChallenge';
import { createClient } from '@/lib/supabase/server';
import { safeNext } from '@/lib/site';

export const metadata: Metadata = { title: 'Two-factor code', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function MfaPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  return (
    <main><div className="wrap"><div className="auth">
      <h1 className="page-title">Two-factor code</h1>
      <p className="lede">Open your authenticator app and enter the 6-digit code for Velkrypt Wire.</p>
      <MfaChallenge next={safeNext(sp.next, '/')} />
    </div></div></main>
  );
}
