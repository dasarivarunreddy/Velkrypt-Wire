'use server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SITE, safeNext } from '@/lib/site';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendConfirmEmail } from '@/lib/email';

const back = (path: string, params: Record<string, string>) => redirect(`${path}?${new URLSearchParams(params)}`);

export async function signIn(formData: FormData) {
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const password = String(formData.get('password') || '');
  const next = safeNext(String(formData.get('next') || ''));
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  // Generic message: never reveal whether an email has an account.
  if (error) back('/login', { error: 'That email and password do not match. Try again or reset your password.', next });
  redirect(next);
}

export async function signUp(formData: FormData) {
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const password = String(formData.get('password') || '');
  const display_name = String(formData.get('display_name') || '').trim().slice(0, 60);
  const newsletter = formData.get('newsletter') === 'on';
  if (password.length < 10) back('/signup', { error: 'Use a password of at least 10 characters.' });
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email, password,
    options: { data: { display_name }, emailRedirectTo: `${SITE.url}/auth/callback?next=/account` },
  });
  if (error) back('/signup', { error: error.message });
  if (newsletter) {
    try {
      const token = crypto.randomUUID();
      const db = createAdminClient();
      const { data: existing } = await db.from('subscribers').select('status').eq('email', email).maybeSingle();
      if (existing?.status !== 'active') {
        await db.from('subscribers').upsert({ email, status: 'pending', token }, { onConflict: 'email' });
        await sendConfirmEmail(email, token);
      }
    } catch { /* newsletter is optional; never block sign-up */ }
  }
  back('/login', { message: 'Check your inbox and click the link to confirm your account, then sign in.' });
}

export async function sendReset(formData: FormData) {
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${SITE.url}/auth/callback?next=/reset-password` });
  back('/forgot-password', { message: 'If that email has an account, a reset link is on its way.' });
}

export async function setNewPassword(formData: FormData) {
  const password = String(formData.get('password') || '');
  if (password.length < 10) back('/reset-password', { error: 'Use a password of at least 10 characters.' });
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) back('/reset-password', { error: 'Your reset link has expired. Request a new one.' });
  back('/account', { message: 'Password updated.' });
}
