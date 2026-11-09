import { CATEGORIES, SEVERITIES, type Article } from '@/lib/site';
import { saveArticle } from '@/app/admin/actions';

type Draft = Partial<Article> & { premium_md?: string; feed_id?: string };

export default function ArticleForm({ article }: { article: Draft }) {
  const id = article.id ?? null;
  const published = article.status === 'published';
  return (
    <form className="form" action={saveArticle.bind(null, id)}>
      {article.feed_id && <input type="hidden" name="feed_id" value={article.feed_id} />}
      <label htmlFor="title">Headline<input id="title" name="title" defaultValue={article.title} required maxLength={200} /></label>
      <label htmlFor="excerpt">Summary (shown on cards and in search results)<textarea id="excerpt" name="excerpt" defaultValue={article.excerpt} maxLength={400} style={{ minHeight: 80 }} /></label>
      <div className="row">
        <label htmlFor="category">Category<select id="category" name="category" defaultValue={article.category ?? 'Vulnerabilities'}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></label>
        <label htmlFor="severity">Severity<select id="severity" name="severity" defaultValue={article.severity ?? 'high'}>{SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
        <label htmlFor="published_at">Publish date (blank = now)<input id="published_at" name="published_at" type="datetime-local" defaultValue={article.published_at ? article.published_at.slice(0, 16) : ''} /></label>
      </div>
      <div className="row">
        <label htmlFor="cves">CVEs (comma separated)<input id="cves" name="cves" defaultValue={article.cves?.join(', ')} placeholder="CVE-2026-19868" /></label>
        <label htmlFor="tags">Tags (comma separated)<input id="tags" name="tags" defaultValue={article.tags?.join(', ')} placeholder="VPN, MFA bypass" /></label>
      </div>
      <div className="row">
        <label htmlFor="source_name">Source name<input id="source_name" name="source_name" defaultValue={article.source_name ?? ''} /></label>
        <label htmlFor="source_url">Source link<input id="source_url" name="source_url" type="url" defaultValue={article.source_url ?? ''} /></label>
        <label htmlFor="slug">URL slug (blank = from headline)<input id="slug" name="slug" defaultValue={article.slug} pattern="[a-z0-9\-]*" /></label>
      </div>
      <label htmlFor="body_md">Story (Markdown). Write it in your own words and link the source.<textarea id="body_md" name="body_md" className="code" defaultValue={article.body_md} /></label>
      <label className="check" htmlFor="is_premium"><input id="is_premium" name="is_premium" type="checkbox" defaultChecked={article.is_premium} /> Add a members-only section</label>
      <label htmlFor="premium_md">Members-only analysis (Markdown; only paying members can load this)<textarea id="premium_md" name="premium_md" className="code" style={{ minHeight: 180 }} defaultValue={article.premium_md ?? ''} /></label>
      <label className="check" htmlFor="is_lead"><input id="is_lead" name="is_lead" type="checkbox" defaultChecked={article.is_lead} /> Make this the lead story on the home page</label>
      <div className="actions">
        <button className="btn" type="submit" name="intent" value="publish">{published ? 'Update live story' : 'Publish now'}</button>
        <button className="btn ghost" type="submit" name="intent" value="draft">{published ? 'Save (stays live)' : 'Save draft'}</button>
        {published && <button className="btn ghost" type="submit" name="intent" value="unpublish">Unpublish</button>}
      </div>
    </form>
  );
}
