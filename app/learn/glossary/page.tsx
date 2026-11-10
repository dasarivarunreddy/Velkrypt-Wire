import type { Metadata } from 'next';
import Link from 'next/link';
import { GLOSSARY } from '@/lib/learn/glossary';
import { byId } from '@/lib/learn/resources';

export const metadata: Metadata = { title: 'Cybersecurity glossary in plain English', description: 'CVE, KEV, CVSS, EPSS, zero-day, RCE, ransomware and more, explained in plain English.' };

export default function Glossary() {
  const terms = [...GLOSSARY].sort((a, b) => a.term.localeCompare(b.term));
  return (
    <main><div className="wrap narrow">
      <p className="kicker"><Link href="/learn">Learn</Link><span>Glossary</span></p>
      <h1 className="page-title">Glossary</h1>
      <p className="lede">The words you will see in security news, explained simply.</p>
      <dl style={{ display: 'flex', flexDirection: 'column', gap: 14, margin: 0 }}>
        {terms.map((t) => {
          const r = t.resource ? byId(t.resource) : undefined;
          return (
            <div key={t.slug} id={t.slug} style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }}>
              <dt style={{ fontWeight: 600, fontSize: '1.05rem' }}>{t.term}</dt>
              <dd style={{ margin: '4px 0 0' }}>{t.def}{r && <> <a className="src" href={r.url} target="_blank" rel="noopener noreferrer">Practise: {r.title} ↗</a></>}</dd>
            </div>
          );
        })}
      </dl>
    </div></main>
  );
}
