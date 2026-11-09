import type { Metadata } from 'next';
import Link from 'next/link';
import AuthTabs from '@/components/AuthTabs';
import Notice from '@/components/Notice';
import { signUp } from '@/app/auth/actions';

export const metadata: Metadata = { title: 'Create account', robots: { index: false } };

export default async function Signup({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  return (
    <main><div className="wrap">
      <div className="auth">
        <h1 className="page-title">Create your account</h1>
        <AuthTabs active="signup" />
        <p className="src">Free accounts can comment and save stories. Members also unlock premium analysis.</p>
        <Notice error={sp.error} />
        <form className="form" action={signUp}>
          <label htmlFor="display_name">Display name<input id="display_name" name="display_name" maxLength={60} autoComplete="nickname" /></label>
          <label htmlFor="email">Email<input id="email" name="email" type="email" autoComplete="email" required /></label>
          <label htmlFor="password">Password (10+ characters)<input id="password" name="password" type="password" minLength={10} autoComplete="new-password" required /></label>
          <label className="check" htmlFor="newsletter"><input id="newsletter" name="newsletter" type="checkbox" defaultChecked /> Send me the Weekly Wire newsletter</label>
          <button className="btn" type="submit">Create account</button>
        </form>
        <p className="src">By creating an account you agree to the <Link href="/terms">terms</Link> and <Link href="/privacy">privacy policy</Link>.</p>
      </div>
    </div></main>
  );
}
