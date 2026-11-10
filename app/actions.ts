'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { createAdminClient } from '@/lib/supabase/admin';
import { clearSessionCookies, logEvent, requestContext } from '@/lib/security/device';

export async function addComment(articleId: string, slug: string, formData: FormData) {
  const { supabase, user } = await getSession();
  if (!user) redirect(`/login?next=/article/${slug}`);
  const body = String(formData.get('body') || '').trim().slice(0, 2000);
  if (!body) return;
  await supabase.from('comments').insert({ article_id: articleId, user_id: user.id, body });
  revalidatePath(`/article/${slug}`);
}

export async function deleteComment(commentId: string, slug: string) {
  const { supabase, user, profile } = await getSession();
  if (!user) return;
  const { data } = await supabase.from('comments').delete().eq('id', commentId).select('user_id,body'); // RLS: own comment, or staff with "comments"
  if (data?.[0] && data[0].user_id !== user.id) await audit({ id: user.id, name: profile?.display_name }, 'Deleted reader comment', slug, { text: String(data[0].body).slice(0, 200) });
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

export async function updateAuthorProfile(formData: FormData) {
  const { supabase, user } = await getSession();
  if (!user) redirect('/login');
  const g = (k: string, n: number) => String(formData.get(k) || '').trim().slice(0, n) || null;
  const linkedin = g('linkedin', 200); const website = g('website', 200);
  const { error } = await supabase.from('profiles').update({
    job_title: g('job_title', 80), bio: g('bio', 600),
    linkedin: linkedin && /^https:\/\/(www\.)?linkedin\.com\//.test(linkedin) ? linkedin : null,
    website: website && /^https:\/\//.test(website) ? website : null,
  }).eq('id', user.id);
  revalidatePath('/account');
  redirect('/account?' + (error ? 'error=' + encodeURIComponent('Could not save. Check the links start with https://') : 'message=' + encodeURIComponent('Author profile saved.')));
}

export async function signOut() {
  const { supabase } = await getSession();
  await supabase.auth.signOut({ scope: 'local' });
  await clearSessionCookies();
  redirect('/');
}

/** Ends every session on every device and forgets all trusted browsers. */
export async function signOutEverywhere() {
  const { supabase, user } = await getSession();
  if (!user) redirect('/login');
  await logEvent(user.id, await requestContext(), 'Signed out everywhere');
  await createAdminClient().from('trusted_devices').delete().eq('user_id', user.id);
  await supabase.auth.signOut({ scope: 'global' });
  await clearSessionCookies(true);
  redirect('/login?message=' + encodeURIComponent('Signed out on every device. Sign in again to continue.'));
}

