import { CATEGORIES, SEVERITIES, type Article } from '@/lib/site';
import { saveArticle } from '@/app/admin/actions';
import DuplicateWarning from './DuplicateWarning';

type Check = { label: string; ok: boolean; note?: string };
type Draft = Partial<Article> & {
  premium_md?: string; feed_id?: string; verification?: string | null; sources?: { name: string; url: string }[];
  entities?: string[]; developing?: boolean; ai_generated?: boolean; ai_checks?: Check[]; scheduled_for?: string | null;
};

const VERIFICATION = [
  ['', 'Not set'], ['official', '🏛️ Official advisory'], ['confirmed', '✅ Confirmed by victim/vendor'],
  ['claimed', '⚠️ Claimed by attackers, unverified'], ['investigating', '🔍 Under investigation'],
] as const;

export default function ArticleForm({ article, canPublish }: { article: Draft; canPublish: boolean }) {
  const id = article.id ?? null;
  const status = article.status ?? 'draft';
  const published = status === 'published';
  const checks = article.ai_checks ?? [];
  return (
    <form id="article-form" className="form" action={saveArticle.bind(null, id)}>
      {article.feed_id && <input type="hidden" name="feed_id" value={article.feed_id} />}
      <DuplicateWarning excludeId={id} />

      {article.ai_generated && checks.length > 0 && (
        <div className="panel">
          <h3>AI self-check · {checks.filter((c) => c.ok).length}/{checks.length} passed</h3>
          <ul className="list-plain" style={{ listStyle: 'none', paddingLeft: 0 }}>
            {checks.map((c, i) => <li key={i}>{c.ok ? '✅' : '⚠️'} <b>{c.label}</b>{c.note ? <span className="src"> · {c.note}</span> : null}</li>)}
          </ul>
          <p className="sub">Read the story against the source before publishing. Fix anything marked ⚠️.</p>
        </div>
      )}

      <label htmlFor="title">Headline<input id="title" name="title" defaultValue={article.title} required maxLength={200} /></label>
      <label htmlFor="excerpt">Summary (shown on cards and in search results)<textarea id="excerpt" name="excerpt" defaultValue={article.excerpt} maxLength={400} style={{ minHeight: 80 }} /></label>
      <div className="row">
        <label htmlFor="category">Category<select id="category" name="category" defaultValue={article.category ?? 'Vulnerabilities'}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></label>
        <label htmlFor="severity">Severity<select id="severity" name="severity" defaultValue={article.severity ?? 'high'}>{SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
        <label htmlFor="verification">Verification badge<select id="verification" name="verification" defaultValue={article.verification ?? ''}>{VERIFICATION.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
      </div>
      <div className="row">
        <label htmlFor="cves">CVEs (comma separated)<input id="cves" name="cves" defaultValue={article.cves?.join(', ')} placeholder="CVE-2026-19868" /></label>
        <label htmlFor="tags">Tags (comma separated)<input id="tags" name="tags" defaultValue={article.tags?.join(', ')} placeholder="VPN, MFA bypass" /></label>
        <label htmlFor="entities">Companies / products named<input id="entities" name="entities" defaultValue={article.entities?.join(', ')} placeholder="SonicWall, SonicOS" /></label>
      </div>
      <div className="row">
        <label htmlFor="source_name">Main source name<input id="source_name" name="source_name" defaultValue={article.source_name ?? ''} /></label>
        <label htmlFor="source_url">Main source link<input id="source_url" name="source_url" type="url" defaultValue={article.source_url ?? ''} /></label>
        <label htmlFor="slug">URL slug (blank = from headline)<input id="slug" name="slug" defaultValue={article.slug} pattern="[a-z0-9\-]*" /></label>
      </div>
      <label htmlFor="sources">More sources, one per line as <code>Name | https://link</code>
        <textarea id="sources" name="sources" style={{ minHeight: 70 }} defaultValue={(article.sources ?? []).map((s) => `${s.name} | ${s.url}`).join('\n')} placeholder="Vendor advisory | https://..." />
      </label>
      <label htmlFor="body_md">Story (Markdown). Write it in your own words and link the source.<textarea id="body_md" name="body_md" className="code" defaultValue={article.body_md} /></label>
      <label className="check" htmlFor="is_premium"><input id="is_premium" name="is_premium" type="checkbox" defaultChecked={article.is_premium} /> Add a members-only section</label>
      <label htmlFor="premium_md">Members-only analysis (Markdown; only paying members can load this)<textarea id="premium_md" name="premium_md" className="code" style={{ minHeight: 160 }} defaultValue={article.premium_md ?? ''} /></label>
      <label className="check" htmlFor="developing"><input id="developing" name="developing" type="checkbox" defaultChecked={article.developing} /> Mark as a developing story (shows the updates timeline)</label>
      {canPublish && <label className="check" htmlFor="is_lead"><input id="is_lead" name="is_lead" type="checkbox" defaultChecked={article.is_lead} /> Make this the lead story on the home page</label>}

      {canPublish && (
        <div className="row" style={{ alignItems: 'end' }}>
          <label htmlFor="published_at">Publish date shown (blank = now)<input id="published_at" name="published_at" type="datetime-local" defaultValue={article.published_at ? article.published_at.slice(0, 16) : ''} /></label>
          <label htmlFor="scheduled_for">Or schedule it to go live at<input id="scheduled_for" name="scheduled_for" type="datetime-local" defaultValue={article.scheduled_for ? article.scheduled_for.slice(0, 16) : ''} /></label>
        </div>
      )}
      {!canPublish && <p className="notice">Save a draft, or submit it for review. An editor or the owner publishes it.</p>}
      {status === 'scheduled' && <p className="notice ok">Scheduled to go live at {article.scheduled_for ? new Date(article.scheduled_for).toLocaleString('en-GB', { timeZone: 'Europe/London' }) : '—'} (UK time).</p>}

      <div className="actions">
        {canPublish && <button className="btn" type="submit" name="intent" value="publish">{published ? 'Update live story' : 'Publish now'}</button>}
        {canPublish && !published && <button className="btn ghost" type="submit" name="intent" value="schedule">Schedule</button>}
        <button className="btn ghost" type="submit" name="intent" value="draft">{published ? 'Save (stays live)' : 'Save draft'}</button>
        {!published && status !== 'review' && <button className="btn ghost" type="submit" name="intent" value="review">Submit for review</button>}
        {published && canPublish && <button className="btn ghost" type="submit" name="intent" value="unpublish">Unpublish</button>}
      </div>
    </form>
  );
}
