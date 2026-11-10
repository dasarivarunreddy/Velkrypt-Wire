import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Notice from '@/components/Notice';
import { createClient } from '@/lib/supabase/server';
import { hasActiveChallenge } from '@/lib/security/device';
import { safeNext } from '@/lib/site';
import { cancelSignIn, sendDeviceCodeAgain, verifyDeviceCode } from '@/app/auth/actions';

export const metadata: Metadata = { title: 'Check your email', robots: { index: false } };
export const dynamic = 'force-dynamic';

const mask = (e: string) => e.replace(/^(.{2})[^@]*(@.*)$/, (_, a, b) => `${a}•••${b}`);

export default async function VerifyDevice({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next, '/');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const active = await hasActiveChallenge(user.id);

  return (
    <main><div className="wrap"><div className="auth">
      <h1 className="page-title">Check your email</h1>
      <p className="lede">You&apos;re signing in from a device or place we don&apos;t recognise. {active ? `We sent a 6-digit code to ${mask(user.email || '')}.` : 'We need to email you a 6-digit code to confirm it’s you.'}</p>
      <Notice error={sp.error} message={sp.message} />
      {active ? (
        <form className="form" action={verifyDeviceCode.bind(null, next)}>
          <label htmlFor="code">6-digit code
            <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} required autoFocus
              style={{ fontFamily: 'var(--mono)', fontSize: '1.6rem', letterSpacing: '.4em', textAlign: 'center' }} />
          </label>
          <button className="btn" type="submit">Verify and sign in</button>
        </form>
      ) : null}
      <div className="actions">
        <form action={sendDeviceCodeAgain.bind(null, next)}><button className={`btn${active ? ' ghost small' : ''}`} type="submit">{active ? 'Send a new code' : 'Email me a code'}</button></form>
        <form action={cancelSignIn}><button className="btn ghost small" type="submit">Cancel and sign out</button></form>
      </div>
      <p className="src">The code expires in 10 minutes. After you verify, this browser is remembered for 30 days. If you didn&apos;t try to sign in, someone knows your password: cancel, then reset it.</p>
    </div></div></main>
  );
}
