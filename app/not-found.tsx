import Link from 'next/link';
export default function NotFound() {
  return (
    <main><div className="wrap narrow">
      <p className="kicker"><span className="sev critical">404</span></p>
      <h1 className="page-title">Page not found</h1>
      <p className="lede">This page has been moved, unpublished or never existed.</p>
      <div className="actions"><Link className="btn" href="/">Back to the latest news</Link><Link className="btn ghost" href="/search">Search stories</Link></div>
    </div></main>
  );
}
