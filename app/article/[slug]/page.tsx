import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Kicker from '@/components/Kicker';
import StoryCard from '@/components/StoryCard';
import NewsletterForm from '@/components/NewsletterForm';
import { can, getSession, isMember } from '@/lib/auth';
import { renderMarkdown } from '@/lib/markdown';
import { LIST_COLUMNS, SITE, formatDate, type Article } from '@/lib/site';
import { addComment, deleteComment, toggleBookmark } from '@/app/actions';
import { learnFor } from '@/lib/learn/match';
import { getAiSettings } from '@/lib/newsroom/settings';

type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  const s = await getSession();
  const { data } = await s.supabase.from('articles').select('*').eq('slug', slug).maybeSingle();
  return { ...s, article: data as Article | null };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { article } = await load((await params).slug);
  if (!article) return { title: 'Story not found' };
  return {
    title: article.title,
    description: article.excerpt,
    alternates: { canonical: `${SITE.url}/article/${article.slug}` },
    openGraph: { title: article.title, description: article.excerpt, type: 'article', publishedTime: article.published_at ?? undefined },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const { supabase, user, profile, article } = await load(slug);
  if (!article) notFound();

  const member = isMember(profile);
  let premiumHtml = '';
  if (article.is_premium && member) {
    const { data } = await supabase.from('article_premium').select('body_md').eq('article_id', article.id).maybeSingle();
    premiumHtml = renderMarkdown(data?.body_md ?? '');
  }

  const [{ data: comments }, { data: bookmark }, { data: related }, { data: updates }, { data: corrections }] = await Promise.all([
    supabase.from('comments').select('id,body,created_at,user_id').eq('article_id', article.id).order('created_at'),
    user ? supabase.from('bookmarks').select('article_id').eq('user_id', user.id).eq('article_id', article.id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from('articles').select(LIST_COLUMNS).eq('status', 'published').eq('category', article.category).neq('id', article.id).order('published_at', { ascending: false }).limit(3),
    supabase.from('article_updates').select('id,body_md,source_name,source_url,published_at,created_at').eq('article_id', article.id).eq('status', 'published').order('published_at', { ascending: false }),
    supabase.from('corrections').select('id,note,created_at').eq('article_id', article.id).order('created_at'),
  ]);
  const extra = article as typeof article & { sources?: { name: string; url: string }[]; ai_generated?: boolean; reviewed_by?: string | null };
  const ids = [...new Set((comments ?? []).map((c) => c.user_id))];
  const { data: names } = ids.length ? await supabase.from('public_profiles').select('id,display_name').in('id', ids) : { data: [] };
  const byline = await (async () => {
    const ids = [(article as { author_id?: string | null }).author_id, (article as { reviewed_by?: string | null }).reviewed_by].filter(Boolean) as string[];
    const { data } = ids.length ? await supabase.from('authors').select('id,display_name').in('id', ids) : { data: [] };
    const find = (id?: string | null) => data?.find((x) => x.id === id);
    return { author: find((article as { author_id?: string | null }).author_id), reviewer: find((article as { reviewed_by?: string | null }).reviewed_by) };
  })();
  const nameOf = (id: string) => names?.find((n) => n.id === id)?.display_name || 'Reader';

  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'NewsArticle', headline: article.title, description: article.excerpt,
    datePublished: article.published_at, dateModified: article.updated_at, publisher: { '@type': 'Organization', name: SITE.name },
    isAccessibleForFree: !article.is_premium,
    author: { '@type': 'Organization', name: SITE.name },
  };

  return (
    <main>
      <div className="wrap narrow">
        <article className="article">
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
          {article.status === 'draft' && <p className="notice err">Draft: only staff can see this page.</p>}
          <Kicker a={article} />
          <h1>{article.title}</h1>
          <p className="lede">{article.excerpt}</p>
          <p className="src" style={{ margin: 0 }}>
            By {byline.author ? <Link href={`/author/${byline.author.id}`}>{byline.author.display_name}</Link> : 'Velkrypt Wire Newsroom'}
            {byline.reviewer && byline.reviewer.id !== byline.author?.id && <> · Reviewed by <Link href={`/author/${byline.reviewer.id}`}>{byline.reviewer.display_name}</Link></>}
          </p>
          {(article.cves.length > 0 || article.tags.length > 0) && (
            <div className="chips">
              {article.cves.map((c) => <Link key={c} className="chip" href={`/cve/${c}`}>{c}</Link>)}
              {article.tags.map((t) => <span key={t} className="chip">{t}</span>)}
            </div>
          )}
          <div className="actions">
            <form action={toggleBookmark.bind(null, article.id, article.slug)}>
              <button className="btn ghost small" type="submit">{bookmark ? 'Saved ✓' : 'Save for later'}</button>
            </form>
            {can(profile, 'write') && <Link className="btn ghost small" href={`/admin/articles/${article.id}`}>Edit</Link>}
            <span className="src">Updated {formatDate(article.updated_at)}</span>
          </div>

          {extra.ai_generated && (await getAiSettings()).show_ai_label && <p className="ai-label">🤖 AI-assisted: drafted by the Velkrypt newsroom from the sources below{extra.reviewed_by ? ' and reviewed by an editor' : ''}.</p>}

          {(updates?.length ?? 0) > 0 && (
            <section aria-labelledby="upd-h">
              <h2 id="upd-h" className="kicker" style={{ marginBottom: 10 }}><span className="developing">Developing</span> Latest updates</h2>
              <ul className="timeline">
                {updates!.map((u) => (
                  <li key={u.id}>
                    <time dateTime={u.published_at ?? u.created_at}>{new Date(u.published_at ?? u.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' })} UK</time>
                    {u.body_md}{u.source_url && <> <a className="src" href={u.source_url} target="_blank" rel="noopener noreferrer nofollow">({u.source_name || 'source'})</a></>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(article.body_md) }} />

          {article.is_premium && (member
            ? <div className="prose" dangerouslySetInnerHTML={{ __html: premiumHtml }} />
            : (
              <div className="paywall">
                <h3>Members analysis</h3>
                <p>The full attack chain, detection ideas and hardening steps for this story are for {SITE.name} members.</p>
                <div className="actions">
                  <Link className="btn" href="/membership">Become a member</Link>
                  {!user && <Link className="btn ghost" href={`/login?next=/article/${article.slug}`}>I already have an account</Link>}
                </div>
              </div>
            ))}

          {(extra.sources?.length ?? 0) > 0 ? (
            <div className="src"><b>Sources</b>
              <ul className="list-plain">{extra.sources!.map((x) => <li key={x.url}><a href={x.url} target="_blank" rel="noopener noreferrer nofollow">{x.name}</a></li>)}</ul>
            </div>
          ) : article.source_url && <p className="src">Original reporting: <a href={article.source_url} target="_blank" rel="noopener noreferrer nofollow">{article.source_name || article.source_url}</a></p>}

          {(() => {
            const l = learnFor(`${article.title} ${article.excerpt} ${article.body_md} ${article.tags.join(' ')}`);
            if (!l.terms.length && !l.resources.length) return null;
            return (
              <aside className="learn-box" aria-labelledby="learn-h">
                <h3 id="learn-h">🎓 Learn this</h3>
                {l.terms.length > 0 && <dl>{l.terms.map((t) => <div key={t.slug}><dt><Link href={`/learn/glossary#${t.slug}`}>{t.term}</Link></dt><dd>{t.def}</dd></div>)}</dl>}
                {l.resources.length > 0 && <p style={{ margin: 0 }}><b>Practise it free:</b> {l.resources.map((r, i) => <span key={r.id}>{i ? ' · ' : ''}<a href={r.url} target="_blank" rel="noopener noreferrer">{r.title} ({r.provider}) ↗</a></span>)}</p>}
                <p className="src" style={{ margin: 0 }}>New to cyber? <Link href="/learn">Start a free roadmap</Link>.</p>
              </aside>
            );
          })()}

          {(corrections?.length ?? 0) > 0 && (
            <div className="notice" style={{ maxWidth: '68ch' }}><b>Corrections</b>
              {corrections!.map((c) => <p key={c.id} style={{ margin: '4px 0 0' }}>{formatDate(c.created_at)}: {c.note}</p>)}
            </div>
          )}
        </article>
      </div>

      <div className="wrap narrow" style={{ display: 'flex', flexDirection: 'column', gap: 36, paddingBlock: '0 56px' }}>
        <section className="comments" aria-labelledby="c-h">
          <div className="section-head"><h2 id="c-h">Discussion</h2><span>{comments?.length ?? 0} comments</span></div>
          {(comments ?? []).map((c) => (
            <div className="comment" key={c.id}>
              <div className="meta"><b>{nameOf(c.user_id)}</b><span>{formatDate(c.created_at)}</span>
                {(user?.id === c.user_id || can(profile, 'comments')) && (
                  <form action={deleteComment.bind(null, c.id, article.slug)}><button className="btn ghost small" type="submit">Delete</button></form>
                )}
              </div>
              <p>{c.body}</p>
            </div>
          ))}
          {user ? (
            <form className="form" action={addComment.bind(null, article.id, article.slug)}>
              <label htmlFor="comment-body">Add a comment</label>
              <textarea id="comment-body" name="body" maxLength={2000} required placeholder="Share context, IOCs or questions. Be kind." />
              <div><button className="btn" type="submit">Post comment</button></div>
            </form>
          ) : <p className="src"><Link href={`/login?next=/article/${article.slug}`}>Sign in</Link> to join the discussion.</p>}
        </section>

        <section className="panel">
          <h3>Get the Weekly Wire</h3>
          <p className="sub">The week&apos;s exploited vulnerabilities and breaches, in one email.</p>
          <NewsletterForm id="art-email" />
        </section>

        {related && related.length > 0 && (
          <section>
            <div className="section-head"><h2>More {article.category}</h2></div>
            <div className="grid">{(related as unknown as Article[]).map((a) => <StoryCard key={a.id} a={a} />)}</div>
          </section>
        )}
      </div>
    </main>
  );
}
