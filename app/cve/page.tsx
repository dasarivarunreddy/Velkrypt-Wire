import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getKevCatalog } from '@/lib/kev';
import { formatDate } from '@/lib/site';

export const metadata: Metadata = { title: 'CVE lookup and latest exploited vulnerabilities', description: 'Look up any CVE: severity, whether it is exploited, exploit likelihood and fixes. Plus the latest additions to CISA KEV.' };
export const revalidate = 1800;

async function go(formData: FormData) {
  'use server';
  const id = String(formData.get('id') || '').trim().toUpperCase();
  redirect(/^CVE-\d{4}-\d{4,}$/.test(id) ? `/cve/${id}` : `/search?q=${encodeURIComponent(id)}`);
}

export default async function CveIndex() {
  const kev = (await getKevCatalog()).sort((a, b) => b.dateAdded.localeCompare(a.dateAdded)).slice(0, 25);
  return (
    <main><div className="wrap narrow">
      <h1 className="page-title">CVE lookup</h1>
      <p className="lede">Severity, exploitation status, exploit likelihood and fixes for any CVE, in one place.</p>
      <form className="subscribe" action={go} style={{ maxWidth: 520 }}>
        <label htmlFor="cid" className="sr-only">CVE ID</label>
        <input id="cid" name="id" placeholder="CVE-2026-19868" required style={{ fontFamily: 'var(--mono)' }} />
        <button className="btn" type="submit">Look up</button>
      </form>
      <p className="src">Want to know what to fix first? See the <Link href="/patch-priority">patch priority list</Link>.</p>
      <section>
        <div className="section-head"><h2>Latest exploited</h2><span>CISA KEV</span></div>
        <ul className="kev">{kev.map((k) => (
          <li key={k.cveID}><Link className="id" href={`/cve/${k.cveID}`}>{k.cveID}</Link><span className="date">{formatDate(k.dateAdded)}</span>
            <span className="what">{k.vendorProject} {k.product}: {k.vulnerabilityName.replace(`${k.vendorProject} ${k.product} `, '')}</span>
            {k.knownRansomwareCampaignUse === 'Known' && <span className="rw">USED BY RANSOMWARE</span>}</li>
        ))}</ul>
      </section>
    </div></main>
  );
}
