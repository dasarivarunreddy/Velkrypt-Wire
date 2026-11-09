'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireStaff } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { renderMarkdown, markdownToText } from '@/lib/markdown';
import { sendEdition, button } from '@/lib/email';
import { SITE } from '@/lib/site';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

async function buildEdition(intro: string, includeStories: boolean) {
  let html = renderMarkdown(intro);
  let text = markdownToText(intro);
  if (includeStories) {
    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    const { data } = await createAdminClient().from('articles').select('slug,title,excerpt,severity')
      .eq('status', 'published').gte('published_at', since).order('published_at', { ascending: false }).limit(12);
    const colour: Record<string, string> = { critical: '#C2241C', high: '#C46A06', medium: '#8A7A0A', info: '#2346D8' };
    html += `<h2 style="font:800 22px Impact,'Arial Narrow',sans-serif;text-transform:uppercase;margin:28px 0 8px">This week's stories</h2>`;
    for (const a of data ?? []) {
      const url = `${SITE.url}/article/${a.slug}`;
      html += `<div style="border-top:1px solid #D3DAD6;padding:12px 0"><div style="font:11px monospace;color:${colour[a.severity]};text-transform:uppercase">● ${a.severity}</div><a href="${url}" style="color:#13201E;font-weight:bold;font-size:17px;text-decoration:none">${esc(a.title)}</a><div style="color:#56635F;font-size:14px;margin-top:4px">${esc(a.excerpt)}</div></div>`;
      text += `\n\n${a.title}\n${url}`;
    }
    html += button(SITE.url, 'Read everything on the site');
  }
  return { html, text };
}

export async function sendNewsletter(formData: FormData) {
  const { user } = await requireStaff();
  const subject = String(formData.get('subject') || '').trim().slice(0, 150);
  const intro = String(formData.get('intro') || '');
  const include = formData.get('include_stories') === 'on';
  const mode = String(formData.get('mode'));
  if (!subject) redirect('/admin/newsletter?error=Add%20a%20subject%20line.');

  const { html, text } = await buildEdition(intro, include);
  const db = createAdminClient();

  if (mode === 'test') {
    const { data: me } = await db.from('subscribers').select('token').eq('email', user.email!.toLowerCase()).maybeSingle();
    const r = await sendEdition(`[TEST] ${subject}`, html, text, [{ email: user.email!, token: me?.token ?? crypto.randomUUID() }]);
    redirect(`/admin/newsletter?${r.errors.length ? `error=${encodeURIComponent(r.errors[0])}` : `message=${encodeURIComponent(`Test sent to ${user.email}.`)}`}`);
  }

  if (formData.get('confirm') !== 'on') redirect('/admin/newsletter?error=Tick%20the%20confirmation%20box%20to%20send%20to%20everyone.');
  const { data: subs } = await db.from('subscribers').select('email,token').eq('status', 'active');
  if (!subs?.length) redirect('/admin/newsletter?error=There%20are%20no%20active%20subscribers%20yet.');
  const r = await sendEdition(subject, html, text, subs);
  await db.from('newsletter_issues').insert({ subject, body_md: intro, recipients: r.sent, created_by: user.id });
  revalidatePath('/admin/newsletter');
  revalidatePath('/newsletter');
  redirect(`/admin/newsletter?${r.errors.length ? `error=${encodeURIComponent(`Sent ${r.sent}; some batches failed: ${r.errors[0]}`)}` : `message=${encodeURIComponent(`Sent to ${r.sent} subscribers.`)}`}`);
}
