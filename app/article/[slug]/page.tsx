import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Kicker from '@/components/Kicker';
import StoryCard from '@/components/StoryCard';
import NewsletterForm from '@/components/NewsletterForm';
import { getSession, isMember, isStaff } from '@/lib/auth';
import { renderMarkdown } from '@/lib/markdown';
import { LIST_COLUMNS, SITE, formatDate, type Article } from '@/lib/site';
import { addComment, deleteComment, toggleBookmark } from '@/app/actions';

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

  const [{ data: comments }, { data: bookmark }, { data: related }] = await Promise.all([
    supabase.from('comments').select('id,body,created_at,user_id').eq('article_id', article.id).order('created_at'),
    user ? supabase.from('bookmarks').select('article_id').eq('user_id', user.id).eq('article_id', article.id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from('articles').select(LIST_COLUMNS).eq('status', 'published').eq('category', article.category).neq('id', article.id).order('published_at', { ascending: false }).limit(3),
  ]);
  const ids = [...new Set((comments ?? []).map((c) => c.user_id))];
  const { data: names } = ids.length ? await supabase.from('public_profiles').select('id,display_name').in('id', ids) : { data: [] };
  const nameOf = (id: string) => names?.find((n) => n.id === id)?.display_name || 'Reader';

  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'NewsArticle', headline: article.title, description: article.excerpt,
    datePublished: article.published_at, dateModified: article.updated_at, publisher: { '@type': 'Organization', name: SITE.name },
    isAccessibleForFree: !article.is_premium,
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
          {(article.cves.length > 0 || article.tags.length > 0) && (
            <div className="chips">
              {article.cves.map((c) => <a key={c} className="chip" href={`https://nvd.nist.gov/vuln/detail/${c}`} target="_blank" rel="noopener noreferrer">{c}</a>)}
              {article.tags.map((t) => <span key={t} className="chip">{t}</span>)}
            </div>
          )}
          <div className="actions">
            <form action={toggleBookmark.bind(null, article.id, article.slug)}>
              <button className="btn ghost small" type="submit">{bookmark ? 'Saved ✓' : 'Save for later'}</button>
            </form>
            {isStaff(profile) && <Link className="btn ghost small" href={`/admin/articles/${article.id}`}>Edit</Link>}
            <span className="src">Updated {formatDate(article.updated_at)}</span>
          </div>

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

          {article.source_url && <p className="src">Original reporting: <a href={article.source_url} target="_blank" rel="noopener noreferrer nofollow">{article.source_name || article.source_url}</a></p>}
        </article>
      </div>

      <div className="wrap narrow" style={{ display: 'flex', flexDirection: 'column', gap: 36, paddingBlock: '0 56px' }}>
        <section className="comments" aria-labelledby="c-h">
          <div className="section-head"><h2 id="c-h">Discussion</h2><span>{comments?.length ?? 0} comments</span></div>
          {(comments ?? []).map((c) => (
            <div className="comment" key={c.id}>
              <div className="meta"><b>{nameOf(c.user_id)}</b><span>{formatDate(c.created_at)}</span>
                {(user?.id === c.user_id || isStaff(profile)) && (
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
