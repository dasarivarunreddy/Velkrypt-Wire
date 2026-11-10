'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { can, requireOwner, requireStaff } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { audit } from '@/lib/audit';
import { saveAiSettings, type AiSettings } from '@/lib/newsroom/settings';
import { testProvider } from '@/lib/ai/providers';
import { runAgent } from '@/lib/newsroom/agent';

const CLAIM_MINUTES = 30;
const who = (u: { id: string }, p: { display_name: string | null } | null) => ({ id: u.id, name: p?.display_name });

/** Marks a draft as "being reviewed by me" so other staff don't work on it at the same time. */
export async function claimArticle(id: string, force = false) {
  const { user, profile } = await requireStaff('/admin', 'write');
  const db = createAdminClient();
  const { data: a } = await db.from('articles').select('claimed_by,claimed_at,title').eq('id', id).single();
  const fresh = a?.claimed_at && Date.now() - new Date(a.claimed_at).getTime() < CLAIM_MINUTES * 60_000;
  if (a?.claimed_by && a.claimed_by !== user.id && fresh && !force) return;
  await db.from('articles').update({ claimed_by: user.id, claimed_at: new Date().toISOString() }).eq('id', id);
  if (force && a?.claimed_by && a.claimed_by !== user.id) await audit(who(user, profile), 'Took over review', a?.title ?? id);
  revalidatePath(`/admin/articles/${id}`);
}

export async function releaseClaim(id: string) {
  const { user } = await requireStaff('/admin', 'write');
  await createAdminClient().from('articles').update({ claimed_by: null, claimed_at: null }).eq('id', id).eq('claimed_by', user.id);
  redirect('/admin/review');
}

export async function markAllRead() {
  const { supabase, user } = await requireStaff('/admin');
  const { data } = await supabase.from('notifications').select('id').order('created_at', { ascending: false }).limit(200);
  if (data?.length) await supabase.from('notification_reads').upsert(data.map((n) => ({ user_id: user.id, notification_id: n.id })), { ignoreDuplicates: true });
  revalidatePath('/admin', 'layout');
}

export async function decideUpdate(updateId: string, approve: boolean) {
  const { user, profile } = await requireStaff('/admin', 'publish');
  const db = createAdminClient();
  const { data: u } = await db.from('article_updates').select('article_id,body_md').eq('id', updateId).single();
  if (!u) return;
  await db.from('article_updates').update({ status: approve ? 'published' : 'rejected', published_at: approve ? new Date().toISOString() : null, author_id: user.id }).eq('id', updateId);
  if (approve) await db.from('articles').update({ developing: true, updated_at: new Date().toISOString() }).eq('id', u.article_id);
  await audit(who(user, profile), approve ? 'Published story update' : 'Rejected story update', u.body_md.slice(0, 120), { article: u.article_id });
  revalidatePath('/', 'layout');
}

export async function addUpdate(articleId: string, formData: FormData) {
  const { supabase, user, profile } = await requireStaff('/admin', 'write');
  const body = String(formData.get('update_body') || '').trim();
  const sourceUrl = String(formData.get('update_source_url') || '').trim();
  if (body.length < 3) redirect(`/admin/articles/${articleId}?error=${encodeURIComponent('Write the update first.')}`);
  const publishNow = can(profile, 'publish');
  const { error } = await supabase.from('article_updates').insert({
    article_id: articleId, body_md: body.slice(0, 4000), author_id: user.id,
    source_name: String(formData.get('update_source_name') || '').trim() || null, source_url: /^https?:\/\//.test(sourceUrl) ? sourceUrl : null,
    status: publishNow ? 'published' : 'pending', published_at: publishNow ? new Date().toISOString() : null,
  });
  if (error) redirect(`/admin/articles/${articleId}?error=${encodeURIComponent('Could not add the update.')}`);
  if (publishNow) await supabase.from('articles').update({ developing: true }).eq('id', articleId);
  await audit(who(user, profile), publishNow ? 'Published story update' : 'Suggested story update', body.slice(0, 120), { article: articleId });
  revalidatePath('/', 'layout');
  redirect(`/admin/articles/${articleId}?message=${encodeURIComponent(publishNow ? 'Update published on the story.' : 'Update submitted for review.')}#updates`);
}

export async function addCorrection(articleId: string, formData: FormData) {
  const { supabase, user, profile } = await requireStaff('/admin', 'publish');
  const note = String(formData.get('correction') || '').trim();
  if (note.length < 3) return;
  await supabase.from('corrections').insert({ article_id: articleId, note: note.slice(0, 1000), created_by: user.id });
  await audit(who(user, profile), 'Published correction', note.slice(0, 120), { article: articleId });
  revalidatePath('/', 'layout');
  redirect(`/admin/articles/${articleId}?message=${encodeURIComponent('Correction added to the story.')}`);
}

export async function saveAiSettingsAction(formData: FormData) {
  const { user, profile } = await requireOwner('/admin/ai');
  const n = (k: string, d: number, min: number, max: number) => Math.min(max, Math.max(min, Number(formData.get(k)) || d));
  const v: AiSettings = {
    enabled: formData.get('enabled') === 'on',
    autopublish_official: formData.get('autopublish_official') === 'on',
    daily_request_limit: n('daily_request_limit', 300, 10, 5000),
    escalation_minutes: n('escalation_minutes', 20, 5, 240),
    min_importance: n('min_importance', 3, 1, 5),
    show_ai_label: formData.get('show_ai_label') === 'on',
  };
  await saveAiSettings(v);
  await audit(who(user, profile), v.enabled ? 'Updated AI settings' : 'Paused the AI (kill switch)', null, v);
  redirect('/admin/ai?message=Saved.');
}

export async function testProviderAction(id: string) {
  await requireOwner('/admin/ai');
  const r = await testProvider(id);
  redirect(`/admin/ai?${r.ok ? 'message' : 'error'}=${encodeURIComponent(r.message)}`);
}

export async function runAgentNow() {
  const { user, profile } = await requireOwner('/admin/ai');
  const r = await runAgent({ budgetMs: 40_000 });
  await audit(who(user, profile), 'Ran the AI newsroom manually', null, r as unknown as Record<string, unknown>);
  redirect(`/admin/ai?message=${encodeURIComponent(`Checked ${r.feed.checked} source items (${r.feed.added} new). Processed ${r.processed}.${r.notes.length ? ` Notes: ${r.notes.join(' · ').slice(0, 300)}` : ''}`)}`);
}

export async function setTipStatus(id: string, status: 'read' | 'archived') {
  await requireStaff('/admin/tips', 'tips');
  await createAdminClient().from('tips').update({ status }).eq('id', id);
  revalidatePath('/admin/tips');
}
