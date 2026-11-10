import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE } from '@/lib/site';

export const metadata: Metadata = { title: 'Contact', description: `How to reach ${SITE.name}: news tips, corrections, partnerships and press.` };

export default function Contact() {
  const email = process.env.CONTACT_EMAIL;
  return (
    <main><div className="wrap narrow">
      <h1 className="page-title">Contact</h1>
      <div className="cards">
        <section className="panel"><h3>News tips</h3><p className="sub">Know about a breach or exploited flaw? Tips can be anonymous.</p><div><Link className="btn small" href="/tips">Send a tip</Link></div></section>
        <section className="panel"><h3>Corrections</h3><p className="sub">Spotted a mistake? Comment on the story or send a tip with the link. We correct errors openly at the bottom of each story.</p></section>
        <section className="panel"><h3>Everything else</h3><p className="sub">Partnerships, press and general questions{email ? ':' : '.'}</p>
          {email ? <p style={{ margin: 0, fontFamily: 'var(--mono)', userSelect: 'all', overflowWrap: 'anywhere' }}>{email}</p> : <p className="sub">Use the tip form and say it is a general enquiry.</p>}
        </section>
      </div>
      <p className="src">Security researchers: if you found a vulnerability in this website, please report it through the tip form marked &ldquo;security report&rdquo;. See also <a href="/.well-known/security.txt">security.txt</a>.</p>
    </div></main>
  );
}
