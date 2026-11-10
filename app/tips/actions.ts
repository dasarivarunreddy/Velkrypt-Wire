'use server';
import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyTurnstile } from '@/lib/turnstile';
import { rateLimit } from '@/lib/ratelimit';
import { requestContext } from '@/lib/security/device';
import { notify } from '@/lib/newsroom/notify';

export async function sendTip(formData: FormData) {
  const { ip } = await requestContext();
  const back = (q: string) => redirect(`/tips?${q}`);
  if (!(await verifyTurnstile(formData.get('cf-turnstile-response'), ip))) back('error=' + encodeURIComponent('The security check did not pass. Refresh and try again.'));
  if (!rateLimit(`tip:${ip}`, 5, 3600_000)) back('error=' + encodeURIComponent('Too many tips from your connection. Try again in an hour.'));
  const message = String(formData.get('message') || '').trim();
  const link = String(formData.get('link') || '').trim();
  const contact = String(formData.get('contact') || '').trim().slice(0, 200);
  if (message.length < 10) back('error=' + encodeURIComponent('Tell us a bit more (at least 10 characters).'));
  // We deliberately do not store IP addresses with tips, to protect sources.
  await createAdminClient().from('tips').insert({ message: message.slice(0, 5000), link: /^https?:\/\//.test(link) ? link.slice(0, 500) : null, contact: contact || null });
  await notify('tip', 'New reader tip', { body: message.slice(0, 200), link: '/admin/tips', perm: 'tips' });
  back('sent=1');
}
