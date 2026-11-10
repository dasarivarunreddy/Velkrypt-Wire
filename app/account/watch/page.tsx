import type { Metadata } from 'next';
import Link from 'next/link';
import Notice from '@/components/Notice';
import { isMember, requireUser } from '@/lib/auth';
import { getKevCatalog } from '@/lib/kev';
import { matches } from '@/lib/watch';
import { formatDate } from '@/lib/site';
import { addWatch, removeWatch } from './actions';

export const metadata: Metadata = { title: 'Stack Watch', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function Watch({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const { supabase, profile } = await requireUser('/account/watch');
  const { data: items } = await supabase.from('watch_items').select('*').order('created_at');
  const kev = await getKevCatalog();
  const counts = new Map<string, number>();
  kev.forEach((k) => counts.set(k.vendorProject, (counts.get(k.vendorProject) ?? 0) + 1));
  const vendors = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([v]) => v);
  const since = Date.now() - 90 * 864e5;
  const recent = kev.filter((k) => new Date(k.dateAdded).getTime() >= since && (items ?? []).some((w) => matches(w, k.vendorProject, k.product)))
    .sort((a, b) => b.dateAdded.localeCompare(a.dateAdded)).slice(0, 20);
  const limit = isMember(profile) ? 100 : 3;
  return (
    <main><div className="wrap narrow">
      <p className="kicker"><Link href="/account">Account</Link><span>Stack Watch</span></p>
      <h1 className="page-title">Stack Watch</h1>
      <p className="lede">Tell us what you run. When one of your products gets an exploited flaw or a news story, we email you straight away.</p>
      <Notice error={sp.error} message={sp.message} />
      <form className="panel form" action={addWatch}>
        <h3>Watch a product</h3>
        <div className="row">
          <label htmlFor="vendor">Vendor<input id="vendor" name="vendor" list="vendors" required defaultValue={sp.vendor} placeholder="Fortinet" /></label>
          <label htmlFor="product">Product (optional: blank = everything from this vendor)<input id="product" name="product" placeholder="FortiOS" /></label>
        </div>
        <datalist id="vendors">{vendors.slice(0, 300).map((v) => <option key={v} value={v} />)}</datalist>
        <div className="actions"><button className="btn small" type="submit">Add</button><span className="src">{items?.length ?? 0} of {limit} used{limit === 3 && <> · <Link href="/membership">Members can watch up to 100</Link></>}</span></div>
      </form>
      {(items?.length ?? 0) > 0 && (
        <div className="table-wrap"><table className="data">
          <thead><tr><th>Watching</th><th></th></tr></thead>
          <tbody>{items!.map((w) => <tr key={w.id}><td><b>{w.vendor}</b> {w.product ?? <span className="src">(all products)</span>}</td><td><form action={removeWatch.bind(null, w.id)}><button className="btn ghost small" type="submit">Remove</button></form></td></tr>)}</tbody>
        </table></div>
      )}
      <section>
        <div className="section-head"><h2>Exploited in your stack</h2><span>last 90 days</span></div>
        {recent.length ? <ul className="kev">{recent.map((k) => (
          <li key={k.cveID}><Link className="id" href={`/cve/${k.cveID}`}>{k.cveID}</Link><span className="date">{formatDate(k.dateAdded)}</span><span className="what">{k.vendorProject} {k.product}: {k.vulnerabilityName.replace(`${k.vendorProject} ${k.product} `, '')}</span></li>
        ))}</ul> : <p className="empty">{items?.length ? 'Nothing exploited in your products in the last 90 days.' : 'Add a product above to see what affects you.'}</p>}
      </section>
    </div></main>
  );
}
