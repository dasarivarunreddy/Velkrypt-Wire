import type { Metadata } from 'next';
import Link from 'next/link';
import AuthTabs from '@/components/AuthTabs';
import Notice from '@/components/Notice';
import Turnstile from '@/components/Turnstile';
import { signIn } from '@/app/auth/actions';
import { safeNext } from '@/lib/site';

export const metadata: Metadata = { title: 'Sign in', robots: { index: false } };

export default async function Login({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  return (
    <main><div className="wrap">
      <div className="auth">
        <h1 className="page-title">Welcome back</h1>
        <AuthTabs active="login" />
        <Notice error={sp.error} message={sp.message} />
        <form className="form" action={signIn}>
          <input type="hidden" name="next" value={safeNext(sp.next)} />
          <label htmlFor="email">Email<input id="email" name="email" type="email" autoComplete="email" required /></label>
          <label htmlFor="password">Password<input id="password" name="password" type="password" autoComplete="current-password" required /></label>
          <Turnstile />
          <button className="btn" type="submit">Sign in</button>
        </form>
        <p className="src"><Link href="/forgot-password">Forgot your password?</Link></p>
      </div>
    </div></main>
  );
}
