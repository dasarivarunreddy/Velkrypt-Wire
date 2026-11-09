import { getLatestKev } from '@/lib/kev';

export default async function Ticker() {
  const kev = await getLatestKev(10);
  if (kev.length === 0) return null;
  const items = kev.map((k) => (
    <li key={k.cveID}>{k.cveID}<span>{k.vendorProject} {k.product}</span></li>
  ));
  return (
    <div className="ticker" aria-label="Recently exploited vulnerabilities">
      <div className="wrap">
        <span className="tag">EXPLOITED</span>
        <div className="track">
          <ul>{items}{kev.map((k) => <li key={k.cveID + '-2'} aria-hidden="true">{k.cveID}<span>{k.vendorProject} {k.product}</span></li>)}</ul>
        </div>
      </div>
    </div>
  );
}
