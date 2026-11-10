import Link from 'next/link';
export default function AuthTabs({ active }: { active: 'login' | 'signup' }) {
  return (
    <div className="tabs">
      <Link href="/login" aria-current={active === 'login' ? 'page' : undefined}>Sign in</Link>
      <Link href="/signup" aria-current={active === 'signup' ? 'page' : undefined}>Create account</Link>
    </div>
  );
}
