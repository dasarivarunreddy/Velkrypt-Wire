import 'server-only';
import { Resend } from 'resend';
import { SITE } from '@/lib/site';

const from = () => process.env.EMAIL_FROM || `${SITE.name} <onboarding@resend.dev>`;
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
  return resend().emails.send({
    from: from(), to: email, subject: `Confirm your ${SITE.name} subscription`,
    html: layout('Confirm subscription', `<p>Thanks for signing up to the Weekly Wire. Please confirm this is your email address:</p>${button(url, 'Confirm subscription')}<p style="font-size:13px;color:#56635F">If you did not sign up, ignore this email and nothing will happen.</p>`),
    text: `Confirm your subscription: ${url}\n\nIf you did not sign up, ignore this email.`,
  });
}

export async function sendWelcomeEmail(email: string, token: string) {
  return resend().emails.send({
    from: from(), to: email, subject: `Welcome to the Weekly Wire`,
    headers: { 'List-Unsubscribe': `<${unsubscribeUrl(token)}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
    html: layout('Welcome', `<p>You are subscribed. Every week you will get the exploited vulnerabilities to patch, the breaches that matter and what to do about them.</p>${button(SITE.url, 'Read the latest stories')}`, unsubscribeUrl(token)),
    text: `You are subscribed to the Weekly Wire. Read the latest: ${SITE.url}`,
  });
}

/** Sends one edition to many people in batches of 100, each with their own unsubscribe link. */
export async function sendEdition(subject: string, htmlBody: string, textBody: string, recipients: { email: string; token: string }[]) {
  let sent = 0;
  const errors: string[] = [];
  for (let i = 0; i < recipients.length; i += 100) {
    const chunk = recipients.slice(i, i + 100).map((r) => ({
      from: from(), to: r.email, subject,
      headers: { 'List-Unsubscribe': `<${unsubscribeUrl(r.token)}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
      html: layout('Weekly Wire', htmlBody, unsubscribeUrl(r.token)),
      text: `${textBody}\n\nUnsubscribe: ${unsubscribeUrl(r.token)}`,
    }));
    const { error } = await resend().batch.send(chunk);
    if (error) errors.push(error.message); else sent += chunk.length;
  }
  return { sent, errors };
}
