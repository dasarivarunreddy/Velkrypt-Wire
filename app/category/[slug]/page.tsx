import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import StoryCard from '@/components/StoryCard';
import { createClient } from '@/lib/supabase/server';
import { LIST_COLUMNS, categoryFromSlug, type Article } from '@/lib/site';

type Props = { params: Promise<{ slug: string }> };
export const revalidate = 300;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const cat = categoryFromSlug((await params).slug);
  return { title: cat ?? 'Category' };
}

export default async function CategoryPage({ params }: Props) {
  const cat = categoryFromSlug((await params).slug);
  if (!cat) notFound();
  const supabase = await createClient();
  const { data } = await supabase.from('articles').select(LIST_COLUMNS).eq('status', 'published').eq('category', cat).order('published_at', { ascending: false }).limit(60);
  const list = (data ?? []) as unknown as Article[];
  return (
    <main><div className="wrap">
      <section>
        <div className="section-head"><h1>{cat}</h1><span>{list.length} stories</span></div>
        {list.length ? <div className="grid">{list.map((a) => <StoryCard key={a.id} a={a} />)}</div> : <p className="empty">No {cat.toLowerCase()} stories yet.</p>}
      </section>
    </div></main>
  );
}
