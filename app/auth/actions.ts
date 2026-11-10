'use server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { SITE, safeNext } from '@/lib/site';
import { sendConfirmEmail } from '@/lib/email';
import { verifyTurnstile } from '@/lib/turnstile';
import { rateLimit } from '@/lib/ratelimit';
import {
  clearSessionCookies, createChallenge, isTrustedDevice, logEvent, markSessionVerified,
  requestContext, verifyChallenge, welcomeNewDevice,
} from '@/lib/security/device';
import { hasVerifiedFactor, jwtClaims } from '@/lib/security/session';

const back = (path: string, params: Record<string, string>) => redirect(`${path}?${new URLSearchParams(params)}`);
const BOT = 'The security check did not pass. Refresh the page and try again.';

// ---------------------------------------------------------------- sign in
export async function signIn(formData: FormData) {
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const password = String(formData.get('password') || '');
  const next = safeNext(String(formData.get('next') || ''));
  const ctx = await requestContext();
  if (!(await verifyTurnstile(formData.get('cf-turnstile-response'), ctx.ip))) back('/login', { error: BOT, next });

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  // Same message either way: never reveal whether an email has an account.
  if (error || !data.user) back('/login', { error: 'That email and password do not match. Try again or reset your password.', next });
  const user = data.user!;

  // Step 1: authenticator app, if the account has one.
  if (hasVerifiedFactor(user)) {
    await logEvent(user.id, ctx, 'Password OK, waiting for authenticator code');
    redirect(`/login/mfa?next=${encodeURIComponent(next)}`);
  }

  // Step 2: known device? Otherwise email a one-time code.
  if (await isTrustedDevice(user.id, ctx)) {
    await markSessionVerified(supabase);
    await logEvent(user.id, ctx, 'Signed in');
    redirect(next);
  }
  const problem = await createChallenge(user.id, user.email!, ctx);
  await logEvent(user.id, ctx, 'New device: code emailed');
  redirect(`/login/verify?next=${encodeURIComponent(next)}${problem ? `&error=${encodeURIComponent(problem)}` : ''}`);
}

// ---------------------------------------------------------------- new-device code
export async function sendDeviceCodeAgain(next: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const problem = await createChallenge(user.id, user.email!, await requestContext());
  back('/login/verify', problem ? { error: problem, next } : { message: 'New code sent. Check your inbox.', next });
}

export async function verifyDeviceCode(next: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const ctx = await requestContext();
  const problem = await verifyChallenge(user.id, String(formData.get('code') || ''));
  if (problem) {
    await logEvent(user.id, ctx, 'Wrong device code');
    back('/login/verify', { error: problem, next });
  }
  await markSessionVerified(supabase);
  await welcomeNewDevice(user.id, user.email, ctx, 'Signed in on new device (email code)');
  redirect(safeNext(next));
}

// ---------------------------------------------------------------- authenticator step done
export async function completeMfa(next: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: { session } } = await supabase.auth.getSession();
  if (!user || jwtClaims(session?.access_token)?.aal !== 'aal2') redirect('/login');
  const ctx = await requestContext();
  await markSessionVerified(supabase);
  if (await isTrustedDevice(user.id, ctx)) await logEvent(user.id, ctx, 'Signed in (authenticator)');
  else await welcomeNewDevice(user.id, user.email, ctx, 'Signed in on new device (authenticator)');
  redirect(safeNext(next));
}

export async function cancelSignIn() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: 'local' });
  await clearSessionCookies();
  redirect('/login');
}

// ---------------------------------------------------------------- sign up with a 6-digit code
export async function signUp(formData: FormData) {
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const password = String(formData.get('password') || '');
  const display_name = String(formData.get('display_name') || '').trim().slice(0, 60);
  const newsletter = formData.get('newsletter') === 'on';
  const ctx = await requestContext();
  if (!(await verifyTurnstile(formData.get('cf-turnstile-response'), ctx.ip))) back('/signup', { error: BOT });
  if (password.length < 10) back('/signup', { error: 'Use a password of at least 10 characters.' });

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { data: { display_name }, emailRedirectTo: `${SITE.url}/auth/callback?next=/account` },
  });
  if (error) back('/signup', { error: error.message });

  if (newsletter) {
    try {
      const db = createAdminClient();
      const { data: existing } = await db.from('subscribers').select('status').eq('email', email).maybeSingle();
      if (existing?.status !== 'active') {
        const token = crypto.randomUUID();
        await db.from('subscribers').upsert({ email, status: 'pending', token }, { onConflict: 'email' });
        await sendConfirmEmail(email, token);
      }
    } catch { /* newsletter is optional; never block sign-up */ }
  }

  // If email confirmation is switched off in Supabase, the user is signed in already.
  if (data.session && data.user) {
    await markSessionVerified(supabase);
    await welcomeNewDevice(data.user.id, data.user.email, ctx, 'Account created');
    redirect('/account');
  }
  back('/signup/verify', { email });
}

export async function verifySignupCode(formData: FormData) {
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const token = String(formData.get('code') || '').replace(/\D/g, '');
  const ip = (await requestContext()).ip ?? 'x';
  if (!rateLimit(`signup-verify:${email}:${ip}`, 8, 15 * 60 * 1000)) back('/signup/verify', { email, error: 'Too many tries. Wait 15 minutes and try again.' });

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
  if (error || !data.user) back('/signup/verify', { email, error: 'That code is wrong or has expired. Check the latest email or send a new code.' });
  await markSessionVerified(supabase);
  await welcomeNewDevice(data.user!.id, undefined, await requestContext(), 'Account created and email verified');
  back('/account', { message: 'Your account is ready. Welcome to Velkrypt Wire!' });
}

export async function resendSignupCode(formData: FormData) {
  const email = String(formData.get('email') || '').trim().toLowerCase();
  if (!rateLimit(`signup-resend:${email}`, 3, 60 * 60 * 1000)) back('/signup/verify', { email, error: 'Too many codes requested. Wait an hour.' });
  const supabase = await createClient();
  await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: `${SITE.url}/auth/callback?next=/account` } });
  back('/signup/verify', { email, message: 'If that address is waiting for confirmation, a new code is on its way.' });
}

// ---------------------------------------------------------------- password reset
export async function sendReset(formData: FormData) {
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const ip = (await requestContext()).ip;
  if (!(await verifyTurnstile(formData.get('cf-turnstile-response'), ip))) back('/forgot-password', { error: BOT });
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
