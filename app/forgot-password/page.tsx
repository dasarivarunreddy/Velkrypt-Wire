import type { Metadata } from 'next';
import Notice from '@/components/Notice';
import { sendReset } from '@/app/auth/actions';

export const metadata: Metadata = { title: 'Reset password', robots: { index: false } };

export default async function Forgot({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  return (
    <main><div className="wrap"><div className="auth">
      <h1 className="page-title">Reset password</h1>
      <Notice message={sp.message} />
      <form className="form" action={sendReset}>
        <label htmlFor="email">Account email<input id="email" name="email" type="email" required autoComplete="email" /></label>
        <button className="btn" type="submit">Send reset link</button>
      </form>
    </div></div></main>
  );
}
