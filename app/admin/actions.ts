'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireStaff } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { CATEGORIES, SEVERITIES, slugify } from '@/lib/site';
import { runFeed } from '@/lib/feed';

const list = (v: FormDataEntryValue | null) => String(v || '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 15);

export async function saveArticle(id: string | null, formData: FormData) {
  const { supabase, user } = await requireStaff();
  const title = String(formData.get('title') || '').trim();
  const category = String(formData.get('category'));
  const severity = String(formData.get('severity'));
  const intent = String(formData.get('intent') || 'draft');
  const back = (error: string) => redirect(`/admin/articles/${id ?? 'new'}?error=${encodeURIComponent(error)}`);
  if (title.length < 5) back('Give the story a headline of at least 5 characters.');
  if (!CATEGORIES.includes(category as never) || !SEVERITIES.includes(severity as never)) back('Pick a category and severity.');
  const sourceUrl = String(formData.get('source_url') || '').trim();
  if (sourceUrl && !/^https?:\/\//.test(sourceUrl)) back('The source link must start with https://');

  const status = intent === 'publish' ? 'published' : intent === 'unpublish' ? 'draft' : undefined;
  const isLead = formData.get('is_lead') === 'on';
  const row: Record<string, unknown> = {
    title,
    slug: slugify(String(formData.get('slug') || '') || title) || `story-${Date.now()}`,
    excerpt: String(formData.get('excerpt') || '').trim().slice(0, 400),
    body_md: String(formData.get('body_md') || ''),
    category, severity,
    cves: list(formData.get('cves')).map((c) => c.toUpperCase()).filter((c) => /^CVE-\d{4}-\d{4,}$/.test(c)),
    tags: list(formData.get('tags')),
    source_name: String(formData.get('source_name') || '').trim() || null,
    source_url: sourceUrl || null,
    is_premium: formData.get('is_premium') === 'on',
    is_lead: isLead,
  };
  if (status) row.status = status;
  if (status === 'published') row.published_at = String(formData.get('published_at') || '') ? new Date(String(formData.get('published_at'))).toISOString() : new Date().toISOString();

  if (isLead) await supabase.from('articles').update({ is_lead: false }).eq('is_lead', true);

  let articleId = id;
  if (id) {
    const { error } = await supabase.from('articles').update(row).eq('id', id);
    if (error) back(error.message.includes('slug') ? 'Another story already uses that URL slug.' : error.message);
  } else {
    const { data, error } = await supabase.from('articles').insert({ ...row, author_id: user.id, status: status ?? 'draft' }).select('id').single();
    if (error) back(error.message.includes('slug') ? 'Another story already uses that URL slug.' : error.message);
    articleId = data!.id;
  }

  const premium = String(formData.get('premium_md') || '');
  await supabase.from('article_premium').upsert({ article_id: articleId, body_md: premium });

  const feedId = String(formData.get('feed_id') || '');
  if (feedId) await supabase.from('feed_items').update({ status: 'imported', article_id: articleId }).eq('id', feedId);

  revalidatePath('/', 'layout');
  redirect(`/admin/articles/${articleId}?message=${encodeURIComponent(status === 'published' ? 'Published. It is live now.' : 'Saved.')}`);
}

export async function deleteArticle(id: string) {
  const { supabase } = await requireStaff();
  await supabase.from('articles').delete().eq('id', id);
  revalidatePath('/', 'layout');
  redirect('/admin/articles?message=Story%20deleted.');
}

export async function fetchFeedNow() {
  await requireStaff();
  const r = await runFeed();
  revalidatePath('/admin/feed');
  redirect(`/admin/feed?message=${encodeURIComponent(`Checked ${r.checked} items, ${r.added} new.${r.errors.length ? ` ${r.errors.length} source(s) failed: ${r.errors.join('; ').slice(0, 200)}` : ''}`)}`);
}

export async function dismissFeedItem(id: string) {
  const { supabase } = await requireStaff();
  await supabase.from('feed_items').update({ status: 'dismissed' }).eq('id', id);
  revalidatePath('/admin/feed');
}

export async function setUserAccess(userId: string, formData: FormData) {
  const { profile } = await requireStaff();
  if (profile?.role !== 'admin') redirect('/admin');
  const role = String(formData.get('role'));
  if (!['reader', 'editor', 'admin'].includes(role)) return;
  await createAdminClient().from('profiles').update({ role, is_premium: formData.get('is_premium') === 'on' }).eq('id', userId);
  revalidatePath('/admin/users');
}
