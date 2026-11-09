import type { Metadata } from 'next';
import Notice from '@/components/Notice';
import { setNewPassword } from '@/app/auth/actions';

export const metadata: Metadata = { title: 'Choose a new password', robots: { index: false } };

export default async function Reset({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  return (
    <main><div className="wrap"><div className="auth">
      <h1 className="page-title">New password</h1>
      <Notice error={sp.error} />
      <form className="form" action={setNewPassword}>
        <label htmlFor="password">New password (10+ characters)<input id="password" name="password" type="password" minLength={10} required autoComplete="new-password" /></label>
        <button className="btn" type="submit">Save password</button>
      </form>
    </div></div></main>
  );
}
