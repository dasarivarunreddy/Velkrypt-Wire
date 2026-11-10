import { getLatestKev } from '@/lib/kev';
import { formatDate } from '@/lib/site';

export default async function KevPanel() {
  const kev = await getLatestKev(6);
  return (
    <section className="panel" aria-labelledby="kev-h">
      <h3 id="kev-h">KEV Watch</h3>
      <p className="sub">Live from CISA&apos;s Known Exploited Vulnerabilities catalog. Patch these first.</p>
      {kev.length === 0 ? (
        <p className="sub">CISA&apos;s feed is not reachable right now. Check the full catalog below.</p>
      ) : (
        <ul className="kev">
          {kev.map((k) => (
            <li key={k.cveID}>
              <a className="id" href={`/cve/${k.cveID}`}>{k.cveID}</a>
              <span className="date">{formatDate(k.dateAdded)}</span>
              <span className="what">{k.vendorProject} {k.product}: {k.vulnerabilityName.replace(`${k.vendorProject} ${k.product} `, '')}</span>
              {k.knownRansomwareCampaignUse === 'Known' && <span className="rw">USED BY RANSOMWARE</span>}
            </li>
          ))}
        </ul>
      )}
      <p className="src"><a href="https://www.cisa.gov/known-exploited-vulnerabilities-catalog" target="_blank" rel="noopener noreferrer">Full catalog at cisa.gov</a></p>
    </section>
  );
}
