import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import StoryCard from '@/components/StoryCard';
import { createClient } from '@/lib/supabase/server';
import { LIST_COLUMNS, SITE, type Article } from '@/lib/site';

type Props = { params: Promise<{ id: string }> };
type Author = { id: string; display_name: string | null; job_title: string | null; bio: string | null; linkedin: string | null; website: string | null; role: string };

async function load(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await (await createClient()).from('authors').select('*').eq('id', id).maybeSingle();
  return data as Author | null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const a = await load((await params).id);
  return a ? { title: `${a.display_name} · ${SITE.name}`, description: a.bio?.slice(0, 160) ?? `Stories by ${a.display_name}` } : { title: 'Author' };
}

export default async function AuthorPage({ params }: Props) {
  const { id } = await params;
  const a = await load(id);
  if (!a) notFound();
  const supabase = await createClient();
  const { data: stories } = await supabase.from('articles').select(LIST_COLUMNS).eq('status', 'published').or(`author_id.eq.${id},reviewed_by.eq.${id}`).order('published_at', { ascending: false }).limit(30);
  const jsonLd = { '@context': 'https://schema.org', '@type': 'Person', name: a.display_name, jobTitle: a.job_title, description: a.bio, url: `${SITE.url}/author/${a.id}`, sameAs: [a.linkedin, a.website].filter(Boolean), worksFor: { '@type': 'Organization', name: SITE.name } };
  return (
    <main><div className="wrap">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <div className="narrow" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p className="kicker"><span>Author</span>{a.role === 'owner' && <span>Founder</span>}</p>
        <h1 className="page-title">{a.display_name}</h1>
        {a.job_title && <p className="lede">{a.job_title}</p>}
        {a.bio && <p style={{ maxWidth: '65ch', margin: 0 }}>{a.bio}</p>}
        <div className="actions">
          {a.linkedin && <a className="btn ghost small" href={a.linkedin} target="_blank" rel="noopener noreferrer me">LinkedIn ↗</a>}
          {a.website && <a className="btn ghost small" href={a.website} target="_blank" rel="noopener noreferrer me">Website ↗</a>}
        </div>
      </div>
      <section>
        <div className="section-head"><h2>Stories</h2><span>{stories?.length ?? 0}</span></div>
        <div className="grid">{((stories ?? []) as unknown as Article[]).map((s) => <StoryCard key={s.id} a={s} />)}</div>
      </section>
    </div></main>
  );
}
