import type { Metadata } from 'next';
import Link from 'next/link';
import { getPatchPriority, getThreatLevel } from '@/lib/threat';
import { formatDate } from '@/lib/site';

export const metadata: Metadata = { title: 'Patch priority: what to fix first this week', description: 'The exploited vulnerabilities to patch first, ranked by ransomware use, exploit likelihood and internet exposure. Updated automatically.' };
export const revalidate = 1800;

export default async function PatchPriority() {
  const [list, threat] = await Promise.all([getPatchPriority(30, 15), getThreatLevel()]);
  return (
    <main><div className="wrap">
      <h1 className="page-title">Patch these first</h1>
      <p className="lede">Exploited flaws from the last 30 days, ranked. Ransomware use, exploit likelihood (EPSS) and internet-facing devices push an item up the list. Threat level: <b>{threat.level}</b>. {threat.summary}</p>
      <div className="table-wrap"><table className="data">
        <thead><tr><th>#</th><th>Flaw</th><th>Product</th><th>Why it&apos;s here</th><th>Added</th></tr></thead>
        <tbody>{list.map((k, i) => (
          <tr key={k.cveID}>
            <td style={{ fontFamily: 'var(--display)', fontSize: '1.4rem', fontWeight: 800 }}>{i + 1}</td>
            <td><Link href={`/cve/${k.cveID}`} style={{ fontFamily: 'var(--mono)' }}>{k.cveID}</Link></td>
            <td><b>{k.vendorProject}</b> {k.product}</td>
            <td>{[k.knownRansomwareCampaignUse === 'Known' && '🔴 Ransomware', k.edge && '🌐 Internet-facing', k.epss !== undefined && `EPSS ${(k.epss * 100).toFixed(0)}%`].filter(Boolean).join(' · ') || 'Exploited in the wild'}</td>
            <td>{formatDate(k.dateAdded)}</td>
          </tr>
        ))}</tbody>
      </table></div>
      <p className="src">Get alerts for your own products with <Link href="/account/watch">Stack Watch</Link>. Ranking is a guide; always check your own exposure.</p>
    </div></main>
  );
}
