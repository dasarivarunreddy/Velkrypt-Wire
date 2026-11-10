import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import StoryCard from '@/components/StoryCard';
import { CVE_RE, getCve, severityOf } from '@/lib/cve';
import { getEpss, getKevCatalog } from '@/lib/kev';
import { createClient } from '@/lib/supabase/server';
import { LIST_COLUMNS, SITE, formatDate, type Article } from '@/lib/site';
import { learnFor } from '@/lib/learn/match';

type Props = { params: Promise<{ id: string }> };
export const revalidate = 3600;

async function load(raw: string) {
  const id = decodeURIComponent(raw).toUpperCase();
  if (!CVE_RE.test(id)) return { id, cve: null, kev: undefined };
  const [cve, kev] = await Promise.all([getCve(id), getKevCatalog().then((all) => all.find((k) => k.cveID === id))]);
  return { id, cve, kev };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, cve, kev } = await load((await params).id);
  if (!cve) return { title: id };
  const title = `${id}${kev ? ` (actively exploited)` : ''}${cve.cvss ? `: CVSS ${cve.cvss}` : ''}`;
  return { title, description: (kev ? `${kev.vendorProject} ${kev.product}: ` : '') + (cve.description ?? '').slice(0, 155), alternates: { canonical: `${SITE.url}/cve/${id}` } };
}

export default async function CvePage({ params }: Props) {
  const raw = (await params).id;
  if (raw !== raw.toUpperCase() && CVE_RE.test(raw.toUpperCase())) redirect(`/cve/${raw.toUpperCase()}`);
  const { id, cve, kev } = await load(raw);
  if (!cve) notFound();
  const epss = (await getEpss([id]))[id];
  const supabase = await createClient();
  const { data: related } = await supabase.from('articles').select(LIST_COLUMNS).eq('status', 'published').contains('cves', [id]).order('published_at', { ascending: false }).limit(6);
  const sev = cve.severity ?? severityOf(cve.cvss);
  const l = learnFor(`${cve.description ?? ''} ${kev?.vulnerabilityName ?? ''}`);
  const jsonLd = { '@context': 'https://schema.org', '@type': 'TechArticle', headline: `${id}${kev ? ` ${kev.vulnerabilityName}` : ''}`, description: cve.description, datePublished: cve.published, dateModified: cve.modified, publisher: { '@type': 'Organization', name: SITE.name } };

  return (
    <main><div className="wrap narrow">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <p className="kicker"><Link href="/cve">CVE database</Link>{cve.published && <span>Published {formatDate(cve.published)}</span>}</p>
      <h1 className="page-title" style={{ fontFamily: 'var(--mono)', fontSize: 'clamp(1.8rem, 6vw, 3rem)' }}>{id}</h1>
      {kev && <p className="lede"><b>{kev.vendorProject} {kev.product}</b>: {kev.vulnerabilityName}</p>}

      <div className="stats">
        <div className="stat"><b className={`sev ${sev}`} style={{ fontSize: '2.2rem' }}>{cve.cvss ?? '—'}</b><span>CVSS score{cve.severity ? ` · ${cve.severity}` : ''}</span></div>
        <div className="stat"><b style={{ color: kev ? 'var(--crit)' : 'var(--ok)' }}>{kev ? 'YES' : 'NO'}</b><span>Known to be exploited (CISA KEV)</span></div>
        <div className="stat"><b>{epss ? `${(epss.epss * 100).toFixed(1)}%` : '—'}</b><span>Chance of exploitation in 30 days (EPSS){epss ? ` · top ${Math.max(1, Math.round((1 - epss.percentile) * 100))}%` : ''}</span></div>
      </div>

      {kev && (
        <div className="notice err" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <b>⚠️ Attackers are using this flaw.</b>
          <span>Added to CISA&apos;s exploited list on {formatDate(kev.dateAdded)}. US federal deadline: {formatDate(kev.dueDate)}.{kev.knownRansomwareCampaignUse === 'Known' && ' Known to be used by ransomware groups.'}</span>
          {kev.requiredAction && <span><b>Action:</b> {kev.requiredAction}</span>}
        </div>
      )}

      <section className="prose"><h2>What it is</h2><p>{cve.description ?? 'No description published yet.'}</p>
        {cve.cwe.length > 0 && <p className="src">Weakness type: {cve.cwe.map((c) => <a key={c} href={`https://cwe.mitre.org/data/definitions/${c.replace('CWE-', '')}.html`} target="_blank" rel="noopener noreferrer">{c} </a>)}</p>}
        {cve.vector && <p className="src">Vector: <code>{cve.vector}</code></p>}
      </section>

      <div className="actions">
        {kev && <Link className="btn" href={`/account/watch?vendor=${encodeURIComponent(kev.vendorProject)}`}>🔔 Alert me about {kev.vendorProject}</Link>}
        <a className="btn ghost" href={`https://nvd.nist.gov/vuln/detail/${id}`} target="_blank" rel="noopener noreferrer">NVD record ↗</a>
      </div>

      {cve.refs.length > 0 && (
        <section><div className="section-head"><h2>Advisories &amp; references</h2></div>
          <ul className="list-plain" style={{ marginTop: 12, overflowWrap: 'anywhere' }}>{cve.refs.map((r) => <li key={r.url}><a href={r.url} target="_blank" rel="noopener noreferrer nofollow">{r.url}</a>{r.tags?.length ? <span className="src"> · {r.tags.slice(0, 2).join(', ')}</span> : null}</li>)}</ul>
        </section>
      )}

      {(related?.length ?? 0) > 0 && (
        <section><div className="section-head"><h2>Our coverage</h2></div><div className="grid">{(related as unknown as Article[]).map((a) => <StoryCard key={a.id} a={a} />)}</div></section>
      )}

      {l.terms.length > 0 && (
        <aside className="learn-box"><h3>🎓 Learn this</h3>
          <dl>{l.terms.slice(0, 3).map((t) => <div key={t.slug}><dt><Link href={`/learn/glossary#${t.slug}`}>{t.term}</Link></dt><dd>{t.def}</dd></div>)}</dl>
        </aside>
      )}
      <p className="src">Data from NVD, CISA KEV and FIRST EPSS. Last refreshed {formatDate(cve.fetched_at)}.</p>
    </div></main>
  );
}
