import type { Metadata } from 'next';
import Notice from '@/components/Notice';
import { resendSignupCode, verifySignupCode } from '@/app/auth/actions';

export const metadata: Metadata = { title: 'Confirm your email', robots: { index: false } };

export default async function SignupVerify({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const email = (sp.email || '').slice(0, 254);
  return (
    <main><div className="wrap"><div className="auth">
      <h1 className="page-title">Confirm your email</h1>
      <p className="lede">We sent a 6-digit code to <b>{email || 'your inbox'}</b>. Enter it below to finish creating your account.</p>
      <Notice error={sp.error} message={sp.message} />
      <form className="form" action={verifySignupCode}>
        <label htmlFor="email">Email<input id="email" name="email" type="email" defaultValue={email} required autoComplete="email" /></label>
        <label htmlFor="code">6-digit code
          <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,10}" maxLength={10} required autoFocus
            style={{ fontFamily: 'var(--mono)', fontSize: '1.6rem', letterSpacing: '.4em', textAlign: 'center' }} />
        </label>
        <button className="btn" type="submit">Confirm and create account</button>
      </form>
      <form action={resendSignupCode} className="actions">
        <input type="hidden" name="email" value={email} />
        <button className="btn ghost small" type="submit">Send a new code</button>
        <span className="src">Check spam too. Codes expire after a while.</span>
      </form>
    </div></div></main>
  );
}
