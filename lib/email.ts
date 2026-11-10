import 'server-only';
import { Resend } from 'resend';
import { SITE } from '@/lib/site';
import { createAdminClient } from '@/lib/supabase/admin';

const from = () => process.env.EMAIL_FROM || `${SITE.name} <onboarding@resend.dev>`;
/** Free Resend plan: 100 emails a day. Raise EMAIL_DAILY_LIMIT when you upgrade. */
export const DAILY_LIMIT = Number(process.env.EMAIL_DAILY_LIMIT || 100);

async function countSent(n: number) {
  try { await createAdminClient().rpc('bump_email_usage', { n }); } catch { /* best effort */ }
}
export async function sentToday() {
  const { data } = await createAdminClient().from('email_usage').select('sent').eq('day', new Date().toISOString().slice(0, 10)).maybeSingle();
  return data?.sent ?? 0;
}

/** Every single email goes through here so the daily total is counted. */
async function deliver(payload: Parameters<ReturnType<typeof resend>['emails']['send']>[0]) {
  const r = await resend().emails.send(payload);
  if (!r.error) await countSent(1);
  return r;
}

export function resend() {
  if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY is not set.');
  return new Resend(process.env.RESEND_API_KEY);
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

/** Plain, robust email layout that renders in every client. */
export function layout(title: string, inner: string, unsubscribeUrl?: string) {
  return `<!doctype html><html><body style="margin:0;background:#EEF1EF;font-family:Arial,Helvetica,sans-serif;color:#13201E">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-top:6px solid #2346D8">
<tr><td style="padding:24px 28px 8px"><div style="font:800 28px Impact,'Arial Narrow',sans-serif;text-transform:uppercase;letter-spacing:.5px">${esc(SITE.name.split(' ')[0])} <span style="color:#2346D8">${esc(SITE.name.split(' ').slice(1).join(' '))}</span></div>
<div style="font:12px monospace;color:#56635F;text-transform:uppercase;letter-spacing:1px">${esc(title)}</div></td></tr>
<tr><td style="padding:8px 28px 24px;font-size:16px;line-height:1.55">${inner}</td></tr>
<tr><td style="padding:16px 28px;border-top:1px solid #D3DAD6;font-size:12px;color:#56635F">You are receiving this from ${esc(SITE.name)} (${esc(SITE.url)}).${unsubscribeUrl ? ` <a href="${unsubscribeUrl}" style="color:#56635F">Unsubscribe</a>.` : ''}</td></tr>
</table></td></tr></table></body></html>`;
}

export const button = (href: string, label: string) =>
  `<p style="margin:20px 0"><a href="${href}" style="background:#13201E;color:#ffffff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block">${esc(label)}</a></p>`;

export const unsubscribeUrl = (token: string) => `${SITE.url}/api/newsletter/unsubscribe?token=${token}`;

export async function sendConfirmEmail(email: string, token: string) {
  const url = `${SITE.url}/api/newsletter/confirm?token=${token}`;
  return deliver({
    from: from(), to: email, subject: `Confirm your ${SITE.name} subscription`,
    html: layout('Confirm subscription', `<p>Thanks for signing up to the Weekly Wire. Please confirm this is your email address:</p>${button(url, 'Confirm subscription')}<p style="font-size:13px;color:#56635F">If you did not sign up, ignore this email and nothing will happen.</p>`),
    text: `Confirm your subscription: ${url}\n\nIf you did not sign up, ignore this email.`,
  });
}

export async function sendWelcomeEmail(email: string, token: string) {
  return deliver({
    from: from(), to: email, subject: `Welcome to the Weekly Wire`,
    headers: { 'List-Unsubscribe': `<${unsubscribeUrl(token)}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
    html: layout('Welcome', `<p>You are subscribed. Every week you will get the exploited vulnerabilities to patch, the breaches that matter and what to do about them.</p>${button(SITE.url, 'Read the latest stories')}`, unsubscribeUrl(token)),
    text: `You are subscribed to the Weekly Wire. Read the latest: ${SITE.url}`,
  });
}

/**
 * Sends one edition, each with its own unsubscribe link. Respects the daily email limit:
 * whatever does not fit today is queued and sent automatically on the following days.
 */
export async function sendEdition(subject: string, htmlBody: string, textBody: string, recipients: { email: string; token: string }[], issueId?: string) {
  const build = (r: { email: string; token: string }) => ({
    from: from(), to: r.email, subject,
    headers: { 'List-Unsubscribe': `<${unsubscribeUrl(r.token)}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
    html: layout('Weekly Wire', htmlBody, unsubscribeUrl(r.token)),
    text: `${textBody}\n\nUnsubscribe: ${unsubscribeUrl(r.token)}`,
  });
  const room = Math.max(0, DAILY_LIMIT - (await sentToday()) - 5); // keep 5 spare for sign-in codes
  const now = recipients.slice(0, room);
  const later = recipients.slice(room);
  let sent = 0;
  const errors: string[] = [];
  for (let i = 0; i < now.length; i += 100) {
    const chunk = now.slice(i, i + 100).map(build);
    const { error } = await resend().batch.send(chunk);
    if (error) errors.push(error.message); else { sent += chunk.length; await countSent(chunk.length); }
  }
  if (later.length) {
    const rows = later.map((r) => { const m = build(r); return { issue_id: issueId ?? null, email: r.email, token: r.token, subject, html: m.html, text_body: m.text }; });
    for (let i = 0; i < rows.length; i += 500) await createAdminClient().from('newsletter_queue').insert(rows.slice(i, i + 500));
  }
  return { sent, queued: later.length, errors };
}

/** Called by the scheduler: sends queued newsletter emails while today's limit allows. */
export async function drainNewsletterQueue() {
  const room = Math.max(0, DAILY_LIMIT - (await sentToday()) - 5);
  if (!room) return 0;
  const db = createAdminClient();
  const { data } = await db.from('newsletter_queue').select('*').order('created_at').limit(Math.min(room, 100));
  if (!data?.length) return 0;
  const { error } = await resend().batch.send(data.map((q) => ({
    from: from(), to: q.email, subject: q.subject, html: q.html, text: q.text_body,
    headers: { 'List-Unsubscribe': `<${unsubscribeUrl(q.token)}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
  })));
  if (error) return 0;
  await countSent(data.length);
  await db.from('newsletter_queue').delete().in('id', data.map((q) => q.id));
  return data.length;
}

/** Plain alert to staff (breaking news, escalations). */
export async function sendStaffAlert(to: string[], subject: string, body: string, link: string) {
  return deliver({
    from: from(), to, subject,
    html: layout('Newsroom alert', `<p>${esc(body)}</p>${button(link, 'Open in admin panel')}`),
    text: `${body}\n\n${link}`,
  });
}

type SigninCtx = { ip: string | null; country: string | null; city: string | null; device: string };
const place = (c: SigninCtx) => [c.city, c.country].filter(Boolean).join(', ') || 'Unknown location';
const detailsTable = (c: SigninCtx) => `<table role="presentation" cellpadding="0" cellspacing="0" style="font-size:14px;margin:12px 0;border-collapse:collapse">
<tr><td style="padding:4px 16px 4px 0;color:#56635F">Time</td><td>${esc(new Date().toUTCString())}</td></tr>
<tr><td style="padding:4px 16px 4px 0;color:#56635F">Device</td><td>${esc(c.device)}</td></tr>
<tr><td style="padding:4px 16px 4px 0;color:#56635F">Location</td><td>${esc(place(c))} (approximate)</td></tr>
<tr><td style="padding:4px 16px 4px 0;color:#56635F">IP address</td><td>${esc(c.ip || 'unknown')}</td></tr></table>`;

export async function sendDeviceCode(email: string, code: string, c: SigninCtx) {
  return deliver({
    from: from(), to: email, subject: `${code} is your ${SITE.name} sign-in code`,
    html: layout('Sign-in code', `<p>Someone signed in to your account with the correct password from a device we don't recognise. Enter this code to finish signing in:</p>
<p style="font:bold 34px monospace;letter-spacing:8px;background:#EEF1EF;padding:14px 18px;display:inline-block;margin:8px 0">${esc(code)}</p>
<p style="font-size:14px;color:#56635F">The code expires in 10 minutes.</p>${detailsTable(c)}
<p><b>Wasn't you?</b> Someone knows your password. Don't share this code, and reset your password now:</p>${button(`${SITE.url}/forgot-password`, 'Reset my password')}`),
    text: `Your ${SITE.name} sign-in code is ${code}. It expires in 10 minutes.\n\nDevice: ${c.device}\nLocation: ${place(c)}\nIP: ${c.ip}\n\nWasn't you? Reset your password: ${SITE.url}/forgot-password`,
  });
}

export async function sendNewSigninAlert(email: string, c: SigninCtx) {
  return deliver({
    from: from(), to: email, subject: `New sign-in to your ${SITE.name} account`,
    html: layout('Security alert', `<p>Your account was just signed in to from a new device.</p>${detailsTable(c)}
<p><b>If this was you</b>, there's nothing to do.</p>
<p><b>If not</b>, reset your password and use "Sign out everywhere" on your account page.</p>${button(`${SITE.url}/forgot-password`, 'Secure my account')}`),
    text: `New sign-in to your ${SITE.name} account.\n\nDevice: ${c.device}\nLocation: ${place(c)}\nIP: ${c.ip}\n\nNot you? Reset your password: ${SITE.url}/forgot-password`,
  });
}

export async function sendCtfReminder(email: string, e: { name: string; url: string; starts_at: string; format: string; location: string }) {
  const when = new Date(e.starts_at).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' });
  return deliver({
    from: from(), to: email, subject: `Starts soon: ${e.name}`,
    html: layout('CTF reminder', `<p><b>${esc(e.name)}</b> starts ${esc(when)} (UK time).</p><p>${esc(e.format)} · ${esc(e.location)}</p>${button(e.url, 'Open the event page')}<p style="font-size:13px;color:#56635F">Tip: read the rules, register your team, and have your tools ready before it starts.</p>`),
    text: `${e.name} starts ${when} (UK time). ${e.url}`,
  });
}

export async function sendWatchAlert(email: string, hits: { title: string; url: string; why: string }[]) {
  const items = hits.map((h) => `<div style="border-top:1px solid #D3DAD6;padding:12px 0"><a href="${h.url}" style="color:#13201E;font-weight:bold;font-size:16px;text-decoration:none">${esc(h.title)}</a><div style="color:#56635F;font-size:14px;margin-top:4px">${esc(h.why)}</div></div>`).join('');
  return deliver({
    from: from(), to: email, subject: `Stack Watch: ${hits.length} new alert${hits.length === 1 ? '' : 's'} for products you use`,
    html: layout('Stack Watch', `<p>Something you watch has new security news:</p>${items}${button(`${SITE.url}/account/watch`, 'Manage what you watch')}`),
    text: hits.map((h) => `${h.title}\n${h.why}\n${h.url}`).join('\n\n') + `\n\nManage alerts: ${SITE.url}/account/watch`,
  });
}
