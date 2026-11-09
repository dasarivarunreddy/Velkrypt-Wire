import Link from 'next/link';
import { notFound } from 'next/navigation';
import ArticleForm from '@/components/ArticleForm';
import Notice from '@/components/Notice';
import { requireStaff } from '@/lib/auth';
import { deleteArticle } from '@/app/admin/actions';
import type { Article } from '@/lib/site';

export const dynamic = 'force-dynamic';

export default async function EditArticle({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  const { id } = await params;
  const sp = await searchParams;
  if (id === 'new') notFound();
  const { supabase } = await requireStaff();
  const { data } = await supabase.from('articles').select('*').eq('id', id).maybeSingle();
  if (!data) notFound();
  const { data: prem } = await supabase.from('article_premium').select('body_md').eq('article_id', id).maybeSingle();
  const a = data as Article;
  return (
    <>
      <div className="section-head"><h1>Edit story</h1><Link className="btn ghost small" href={`/article/${a.slug}`}>View page</Link></div>
      <Notice error={sp.error} message={sp.message} />
      <ArticleForm article={{ ...a, premium_md: prem?.body_md ?? '' }} />
      <form action={deleteArticle.bind(null, a.id)} style={{ borderTop: '1px solid var(--line)', paddingTop: 16 }}>
        <label className="check" htmlFor="confirm-del"><input id="confirm-del" type="checkbox" required /> I want to delete this story permanently</label>
        <div style={{ marginTop: 10 }}><button className="btn danger small" type="submit">Delete story</button></div>
      </form>
    </>
  );
}
