import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { SITE, CATEGORIES, categorySlug, formatDate } from '@/lib/site';
import { getSession, isStaff } from '@/lib/auth';

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name} | ${SITE.tagline}`, template: `%s | ${SITE.name}` },
  description: SITE.description,
  openGraph: { siteName: SITE.name, type: 'website' },
  alternates: { types: { 'application/rss+xml': `${SITE.url}/rss.xml` } },
  twitter: { card: 'summary_large_image' },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
    other: process.env.BING_SITE_VERIFICATION ? { 'msvalidate.01': process.env.BING_SITE_VERIFICATION } : undefined,
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const configured = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const { user, profile } = configured ? await getSession() : { user: null, profile: null };
  const [first, ...rest] = SITE.name.split(' ');

  return (
    <html lang="en-GB">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@600;800&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" />
      </head>
      <body>
        <header className="mast">
          <div className="wrap">
            <Link className="brand" href="/"><p className="logo">{first} <span>{rest.join(' ')}</span></p></Link>
            <div className="dateline">
              <b>{formatDate(new Date().toISOString(), true)}</b>
              <span>{SITE.tagline}</span>
            </div>
          </div>
        </header>
        <nav className="nav" aria-label="Main">
          <div className="wrap">
            <ul>
              <li><Link href="/">Latest</Link></li>
              {CATEGORIES.map((c) => <li key={c}><Link href={`/category/${categorySlug(c)}`}>{c}</Link></li>)}
              <li><Link href="/cve">CVEs</Link></li>
              <li><Link href="/learn" style={{ color: 'var(--accent)' }}>Learn</Link></li>
              <li><Link href="/careers">Careers</Link></li>
              <li><Link href="/ctfs">CTFs</Link></li>
            </ul>
            <div className="acts">
              <form action="/search" role="search">
                <label htmlFor="nav-q" className="sr-only">Search</label>
                <input id="nav-q" name="q" type="search" placeholder="Search CVE, vendor…" />
              </form>
              {isStaff(profile) && <Link className="btn ghost small" href="/admin">Admin</Link>}
              {user ? <Link className="btn ghost small" href="/account">Account</Link> : <Link className="btn ghost small" href="/login">Sign in</Link>}
              {!profile?.is_premium && <Link className="btn small" href="/membership">Join</Link>}
            </div>
          </div>
        </nav>
        {children}
        <footer className="site">
          <div className="wrap">
            <span><b>{SITE.name}</b> · Independent cybersecurity news</span>
            <ul>
              <li><Link href="/about">About</Link></li>
              <li><Link href="/newsletter">Newsletter</Link></li>
              <li><Link href="/tips">Send a tip</Link></li>
              <li><Link href="/contact">Contact</Link></li>
              {process.env.NEXT_PUBLIC_TELEGRAM_URL && <li><a href={process.env.NEXT_PUBLIC_TELEGRAM_URL} target="_blank" rel="noopener noreferrer">Telegram</a></li>}
              {process.env.NEXT_PUBLIC_DISCORD_URL && <li><a href={process.env.NEXT_PUBLIC_DISCORD_URL} target="_blank" rel="noopener noreferrer">Discord</a></li>}
              <li><Link href="/membership">Membership</Link></li>
              <li><Link href="/rss.xml">RSS</Link></li>
              <li><Link href="/privacy">Privacy</Link></li>
              <li><Link href="/terms">Terms</Link></li>
            </ul>
            <span>© {new Date().getFullYear()} {SITE.name}. Summaries are original; full reporting belongs to the linked sources.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
