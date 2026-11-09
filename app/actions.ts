'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';

export async function addComment(articleId: string, slug: string, formData: FormData) {
  const { supabase, user } = await getSession();
  if (!user) redirect(`/login?next=/article/${slug}`);
  const body = String(formData.get('body') || '').trim().slice(0, 2000);
  if (!body) return;
  await supabase.from('comments').insert({ article_id: articleId, user_id: user.id, body });
  revalidatePath(`/article/${slug}`);
}

export async function deleteComment(commentId: string, slug: string) {
  const { supabase, user } = await getSession();
  if (!user) return;
  await supabase.from('comments').delete().eq('id', commentId); // RLS: own comment or staff
  revalidatePath(`/article/${slug}`);
}

export async function toggleBookmark(articleId: string, slug: string) {
  const { supabase, user } = await getSession();
  if (!user) redirect(`/login?next=/article/${slug}`);
  const { data } = await supabase.from('bookmarks').select('article_id').eq('user_id', user.id).eq('article_id', articleId).maybeSingle();
  if (data) await supabase.from('bookmarks').delete().eq('user_id', user.id).eq('article_id', articleId);
  else await supabase.from('bookmarks').insert({ user_id: user.id, article_id: articleId });
  revalidatePath(`/article/${slug}`);
  revalidatePath('/account');
}

export async function updateDisplayName(formData: FormData) {
  const { supabase, user } = await getSession();
  if (!user) redirect('/login');
  const name = String(formData.get('display_name') || '').trim().slice(0, 60);
  await supabase.from('profiles').update({ display_name: name || null }).eq('id', user.id);
  revalidatePath('/account');
}

export async function signOut() {
  const { supabase } = await getSession();
  await supabase.auth.signOut();
  redirect('/');
}

