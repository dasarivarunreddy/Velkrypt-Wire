import type { Metadata } from 'next';
import Link from 'next/link';
import { CERTS } from '@/lib/learn/certs';

export const metadata: Metadata = { title: 'Cybersecurity certifications: an honest UK guide', description: 'Which cybersecurity certifications are worth it for SOC, pentest, cloud, GRC and DFIR roles in the UK, and which to skip.' };

export default function Certs() {
  return (
    <main><div className="wrap">
      <p className="kicker"><Link href="/learn">Learn</Link><span>Certifications</span></p>
      <h1 className="page-title">Which certifications are worth it?</h1>
      <p className="lede">An honest guide. Certifications open doors in HR filters, but hands-on skill and a portfolio get you hired. Prices change often, so check the official page before you book.</p>
      <div className="table-wrap"><table className="data">
        <thead><tr><th>Certification</th><th>Level</th><th>Good for</th><th>Our view</th><th>Cost</th></tr></thead>
        <tbody>{CERTS.map((c) => (
          <tr key={c.name}>
            <td><a href={c.url} target="_blank" rel="noopener noreferrer"><b>{c.name}</b></a><br /><span className="src">{c.body}</span></td>
            <td>{c.level}</td>
            <td>{c.roles.join(', ')}</td>
            <td>{c.worth}{c.note && <><br /><span className="src">ℹ️ {c.note}</span></>}</td>
            <td>{c.cost}</td>
          </tr>
        ))}</tbody>
      </table></div>
      <section className="panel">
        <h3>Our advice</h3>
        <ul className="list-plain">
          <li>Don&apos;t collect certifications. Pick one that matches the job adverts you are applying for.</li>
          <li>Do lots of free hands-on practice first, so the exam confirms skills you already have.</li>
          <li>For UK penetration testing, look at CREST. For UK SOC roles, Microsoft SC-200 is often more useful than people expect.</li>
          <li>Ask employers about funding: many pay for certifications once you are hired.</li>
        </ul>
      </section>
    </div></main>
  );
}
