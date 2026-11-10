'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { can, requireOwner, requireStaff } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { CATEGORIES, SEVERITIES, slugify } from '@/lib/site';
import { PERMISSIONS, PRESETS, type Perm } from '@/lib/permissions';
import { runFeed } from '@/lib/feed';
import { audit } from '@/lib/audit';
import { notify } from '@/lib/newsroom/notify';
import { storyPublished } from '@/lib/newsroom/hooks';

const list = (v: FormDataEntryValue | null) => String(v || '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 15);
const who = (user: { id: string }, profile: { display_name: string | null } | null) => ({ id: user.id, name: profile?.display_name });

// ---------------------------------------------------------------- articles
export async function saveArticle(id: string | null, formData: FormData) {
  const { supabase, user, profile } = await requireStaff('/admin', 'write');
  const title = String(formData.get('title') || '').trim();
  const category = String(formData.get('category'));
  const severity = String(formData.get('severity'));
  const intent = String(formData.get('intent') || 'draft');
  const back = (error: string) => redirect(`/admin/articles/${id ?? 'new'}?error=${encodeURIComponent(error)}`);
  if (title.length < 5) back('Give the story a headline of at least 5 characters.');
  if (!CATEGORIES.includes(category as never) || !SEVERITIES.includes(severity as never)) back('Pick a category and severity.');
  const sourceUrl = String(formData.get('source_url') || '').trim();
  if (sourceUrl && !/^https?:\/\//.test(sourceUrl)) back('The source link must start with https://');

  const canPublish = can(profile, 'publish');
  if (['publish', 'unpublish', 'schedule'].includes(intent) && !canPublish) back('You can save drafts or submit them for review. An editor or the owner publishes them.');
  const scheduleAt = String(formData.get('scheduled_for') || '');
  if (intent === 'schedule' && (!scheduleAt || new Date(scheduleAt).getTime() < Date.now() + 60_000)) back('Pick a publish time at least a minute from now.');
  const { data: before } = id ? await supabase.from('articles').select('status').eq('id', id).maybeSingle() : { data: null };
  const isLead = canPublish && formData.get('is_lead') === 'on';

  const status = intent === 'publish' ? 'published' : intent === 'unpublish' ? 'draft' : intent === 'schedule' ? 'scheduled' : intent === 'review' ? 'review' : undefined;
  const sources = String(formData.get('sources') || '').split('\n').map((l) => l.split('|').map((x) => x.trim())).filter(([, u]) => u && /^https?:\/\//.test(u)).map(([name, url]) => ({ name: name || url, url })).slice(0, 8);
  const verification = String(formData.get('verification') || '');
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
    entities: list(formData.get('entities')),
    sources,
    verification: ['official', 'confirmed', 'claimed', 'investigating'].includes(verification) ? verification : null,
    developing: formData.get('developing') === 'on',
  };
  if (intent === 'schedule') row.scheduled_for = new Date(scheduleAt).toISOString();
  if (status === 'published') { row.reviewed_by = user.id; row.claimed_by = null; row.claimed_at = null; }
  if (canPublish) row.is_lead = isLead;
  if (status) row.status = status;
  if (status === 'published') row.published_at = String(formData.get('published_at') || '') ? new Date(String(formData.get('published_at'))).toISOString() : new Date().toISOString();

  if (isLead) await supabase.from('articles').update({ is_lead: false }).eq('is_lead', true).neq('id', id ?? '00000000-0000-0000-0000-000000000000');

  let articleId = id;
  if (id) {
    const { data, error } = await supabase.from('articles').update(row).eq('id', id).select('id');
    if (error) back(error.message.includes('slug') ? 'Another story already uses that URL slug.' : 'You do not have permission to make that change.');
    if (!data?.length) back("You can't edit this story. Ask an editor or the owner.");
  } else {
    const { data, error } = await supabase.from('articles').insert({ ...row, author_id: user.id, status: status ?? 'draft', is_lead: isLead }).select('id').single();
    if (error) back(error.message.includes('slug') ? 'Another story already uses that URL slug.' : 'You do not have permission to do that.');
    articleId = data!.id;
  }

  await supabase.from('article_premium').upsert({ article_id: articleId, body_md: String(formData.get('premium_md') || '') });

  const feedId = String(formData.get('feed_id') || '');
  if (feedId && can(profile, 'feed')) await supabase.from('feed_items').update({ status: 'imported', article_id: articleId }).eq('id', feedId);

  const wentLive = status === 'published' && before?.status !== 'published';
  if (wentLive) {
    const { data: live } = await supabase.from('articles').select('id,slug,title,excerpt,severity,category,cves,entities,tags').eq('id', articleId).single();
    if (live) await storyPublished(live);
  }
  if (status === 'review' && before?.status !== 'review') await notify('review', `${profile?.display_name || 'A writer'} submitted: ${title}`, { link: `/admin/articles/${articleId}`, perm: 'publish' });
  await audit(who(user, profile), status === 'scheduled' ? `Scheduled story for ${scheduleAt}` : status === 'review' ? 'Submitted for review' : status === 'published' ? 'Published story' : status === 'draft' ? 'Unpublished story' : id ? 'Edited story' : 'Created draft', title, { id: articleId });
  revalidatePath('/', 'layout');
  const msg = status === 'published' ? 'Published. It is live now.' : status === 'scheduled' ? 'Scheduled. It will go live automatically.' : status === 'review' ? 'Submitted for review. Editors have been notified.' : 'Saved.';
  redirect(`/admin/articles/${articleId}?message=${encodeURIComponent(msg)}`);
}

export async function deleteArticle(id: string) {
  const { supabase, user, profile } = await requireStaff('/admin', 'delete');
  const { data } = await supabase.from('articles').delete().eq('id', id).select('title');
  if (data?.length) await audit(who(user, profile), 'Deleted story', data[0].title, { id });
  revalidatePath('/', 'layout');
  redirect('/admin/articles?message=Story%20deleted.');
}

// ---------------------------------------------------------------- feed
export async function fetchFeedNow() {
  await requireStaff('/admin', 'feed');
  const r = await runFeed();
  revalidatePath('/admin/feed');
  redirect(`/admin/feed?message=${encodeURIComponent(`Checked ${r.checked} items, ${r.added} new.${r.errors.length ? ` ${r.errors.length} source(s) failed: ${r.errors.join('; ').slice(0, 200)}` : ''}`)}`);
}

export async function dismissFeedItem(id: string) {
  const { supabase } = await requireStaff('/admin', 'feed');
  await supabase.from('feed_items').update({ status: 'dismissed' }).eq('id', id);
  revalidatePath('/admin/feed');
}

// ---------------------------------------------------------------- people
/** Owner only: set someone's role and exact permissions. The owner row is protected by the database. */
export async function setStaffAccess(userId: string, formData: FormData) {
  const { user, profile } = await requireOwner('/admin/users');
  if (userId === user.id) redirect('/admin/users?error=' + encodeURIComponent('You are the owner. Your access cannot be changed here.'));
  const role = String(formData.get('role'));
  if (!['reader', 'writer', 'editor', 'admin'].includes(role)) redirect('/admin/users?error=Pick%20a%20valid%20role.');

  let permissions: Perm[] = [];
  if (role !== 'reader') {
    const usePreset = formData.get('use_preset') === 'on';
    permissions = usePreset
      ? PRESETS[role as keyof typeof PRESETS]
      : PERMISSIONS.map((p) => p.key).filter((k) => formData.get(`perm_${k}`) === 'on');
  }
  const db = createAdminClient();
  const { data: before } = await db.from('profiles').select('display_name,role,permissions').eq('id', userId).single();
  if (before?.role === 'owner') redirect('/admin/users?error=' + encodeURIComponent('The owner cannot be changed from the website.'));
  const { error } = await db.from('profiles').update({ role, permissions }).eq('id', userId);
  if (error) redirect('/admin/users?error=' + encodeURIComponent(error.message));
  await audit(who(user, profile), 'Changed staff access', before?.display_name ?? userId, { from: { role: before?.role, permissions: before?.permissions }, to: { role, permissions } });
  revalidatePath('/admin/users');
  redirect('/admin/users?message=' + encodeURIComponent(`Saved. ${before?.display_name ?? 'User'} is now ${role}.`));
}

/** Staff with the "users" permission: give or remove free membership for readers. */
export async function setPremium(userId: string, on: boolean) {
  const { user, profile } = await requireStaff('/admin/users', 'users');
  const db = createAdminClient();
  const { data: target } = await db.from('profiles').select('display_name,role').eq('id', userId).single();
  if (!target || target.role !== 'reader') redirect('/admin/users?error=' + encodeURIComponent('Free membership is only for reader accounts.'));
  await db.from('profiles').update({ is_premium: on }).eq('id', userId);
  await audit(who(user, profile), on ? 'Gave free membership' : 'Removed free membership', target.display_name ?? userId);
  revalidatePath('/admin/users');
}
