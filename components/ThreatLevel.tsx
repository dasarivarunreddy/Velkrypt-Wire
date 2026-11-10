import Link from 'next/link';
import { getPatchPriority, getThreatLevel } from '@/lib/threat';

const COLOR: Record<string, string> = { Guarded: 'var(--ok)', Elevated: 'var(--med)', High: 'var(--high)', Severe: 'var(--crit)' };
const LEVELS = ['Guarded', 'Elevated', 'High', 'Severe'];

export default async function ThreatLevel() {
  const [t, top] = await Promise.all([getThreatLevel(), getPatchPriority(14, 5)]);
  const i = LEVELS.indexOf(t.level);
  return (
    <section className="panel" aria-labelledby="tl-h" style={{ borderTop: `6px solid ${COLOR[t.level]}` }}>
      <h3 id="tl-h">Threat level: <span style={{ color: COLOR[t.level] }}>{t.level}</span></h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }} aria-hidden="true">
        {LEVELS.map((l, n) => <span key={l} style={{ height: 8, borderRadius: 4, background: n <= i ? COLOR[t.level] : 'var(--line)' }} />)}
      </div>
      <p className="sub">{t.summary}</p>
      {top.length > 0 && (
        <>
          <b style={{ fontSize: '.9rem' }}>Patch these first</b>
          <ol className="list-plain" style={{ margin: 0 }}>{top.map((k) => <li key={k.cveID}><Link href={`/cve/${k.cveID}`}>{k.vendorProject} {k.product}</Link>{k.knownRansomwareCampaignUse === 'Known' && <span className="rw"> · RANSOMWARE</span>}</li>)}</ol>
          <p className="src" style={{ margin: 0 }}><Link href="/patch-priority">Full list</Link> · <Link href="/account/watch">Alerts for your products</Link></p>
        </>
      )}
    </section>
  );
}
