import 'server-only';
import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { cookies, headers } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { DEV_COOKIE, SV_COOKIE, jwtClaims, proofFor } from './session';
import { sendDeviceCode, sendNewSigninAlert } from '@/lib/email';

const DAY = 24 * 3600 * 1000;
const CODE_TTL_MIN = 10;
const MAX_ATTEMPTS = 5;
const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
const cookieOpts = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/' };

export type Ctx = { ip: string | null; country: string | null; city: string | null; device: string };

export function describeUA(ua: string) {
  const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox'
    : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
  const os = /iPhone|iPad|iPod/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows'
    : /Mac OS X|Macintosh/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'unknown OS';
  return `${browser} on ${os}`;
}

export async function requestContext(): Promise<Ctx> {
  const h = await headers();
  const ip = (h.get('x-forwarded-for')?.split(',')[0] || h.get('x-real-ip') || '').trim() || null;
  let city: string | null = null;
  try { city = h.get('x-vercel-ip-city') ? decodeURIComponent(h.get('x-vercel-ip-city')!) : null; } catch { /* ignore */ }
  return { ip, country: h.get('x-vercel-ip-country'), city, device: describeUA(h.get('user-agent') || '') };
}

export const where = (c: Ctx) => [c.city, c.country].filter(Boolean).join(', ') || 'unknown location';

export async function logEvent(userId: string, ctx: Ctx, event: string) {
  await createAdminClient().from('login_events').insert({ user_id: userId, event, ip: ctx.ip, country: ctx.country, city: ctx.city, device: ctx.device });
}

/** True if this browser was verified before, within 30 days, and the country has not changed. */
export async function isTrustedDevice(userId: string, ctx: Ctx) {
  const token = (await cookies()).get(DEV_COOKIE)?.value;
  if (!token) return false;
  const db = createAdminClient();
  const { data } = await db.from('trusted_devices').select('id,country,expires_at')
    .eq('user_id', userId).eq('token_hash', sha256(token)).maybeSingle();
  if (!data || new Date(data.expires_at).getTime() < Date.now()) return false;
  if (data.country && ctx.country && data.country !== ctx.country) return false; // new country = suspicious
  await db.from('trusted_devices').update({ last_seen: new Date().toISOString() }).eq('id', data.id);
  return true;
}

export async function trustDevice(userId: string, ctx: Ctx) {
  const token = randomBytes(32).toString('base64url');
  const db = createAdminClient();
  await db.from('trusted_devices').insert({
    user_id: userId, token_hash: sha256(token), label: ctx.device, country: ctx.country,
    expires_at: new Date(Date.now() + 30 * DAY).toISOString(),
  });
  (await cookies()).set(DEV_COOKIE, token, { ...cookieOpts, maxAge: 30 * 24 * 3600 });
  // Keep the 10 most recent devices per user.
  const { data } = await db.from('trusted_devices').select('id').eq('user_id', userId).order('created_at', { ascending: false }).range(10, 100);
  if (data?.length) await db.from('trusted_devices').delete().in('id', data.map((d) => d.id));
}

/** Marks the current Supabase session as having passed the device check. */
export async function markSessionVerified(supabase: SupabaseClient) {
  const { data: { session } } = await supabase.auth.getSession();
  const sid = jwtClaims(session?.access_token)?.session_id;
  if (typeof sid !== 'string') return;
  (await cookies()).set(SV_COOKIE, await proofFor(sid), { ...cookieOpts, maxAge: 30 * 24 * 3600 });
}

export async function clearSessionCookies(alsoDevice = false) {
  const jar = await cookies();
  jar.delete(SV_COOKIE);
  if (alsoDevice) jar.delete(DEV_COOKIE);
}

/** Creates and emails a 6-digit code. Returns an error message if rate-limited. */
export async function createChallenge(userId: string, email: string, ctx: Ctx): Promise<string | null> {
  const db = createAdminClient();
  const hourAgo = new Date(Date.now() - 3600 * 1000).toISOString();
  const { data: recent } = await db.from('device_challenges').select('created_at').eq('user_id', userId).gte('created_at', hourAgo).order('created_at', { ascending: false });
  if ((recent?.length ?? 0) >= 5) return 'Too many codes requested. Wait an hour and try again.';
  if (recent?.[0] && Date.now() - new Date(recent[0].created_at).getTime() < 60 * 1000) return 'A code was just sent. Wait a minute before asking for another.';

  await db.from('device_challenges').update({ consumed: true }).eq('user_id', userId).eq('consumed', false);
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  await db.from('device_challenges').insert({
    user_id: userId, code_hash: sha256(`${userId}:${code}`),
    expires_at: new Date(Date.now() + CODE_TTL_MIN * 60 * 1000).toISOString(),
  });
  try { await sendDeviceCode(email, code, ctx); } catch { return 'We could not send the email. Try again shortly.'; }
  return null;
}

export async function hasActiveChallenge(userId: string) {
  const { data } = await createAdminClient().from('device_challenges').select('id')
    .eq('user_id', userId).eq('consumed', false).gt('expires_at', new Date().toISOString()).limit(1);
  return !!data?.length;
}

/** Checks a code. Returns null on success or a message explaining the failure. */
export async function verifyChallenge(userId: string, code: string): Promise<string | null> {
  const db = createAdminClient();
  const { data: ch } = await db.from('device_challenges').select('*')
    .eq('user_id', userId).eq('consumed', false).gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (!ch) return 'That code has expired. Send a new one.';
  if (ch.attempts >= MAX_ATTEMPTS) return 'Too many wrong codes. Send a new one.';
  const given = Buffer.from(sha256(`${userId}:${code.replace(/\D/g, '')}`));
  const ok = given.length === Buffer.from(ch.code_hash).length && timingSafeEqual(given, Buffer.from(ch.code_hash));
  if (!ok) {
    await db.from('device_challenges').update({ attempts: ch.attempts + 1 }).eq('id', ch.id);
    return `That code is not right. ${Math.max(0, MAX_ATTEMPTS - ch.attempts - 1)} tries left.`;
  }
  await db.from('device_challenges').update({ consumed: true }).eq('id', ch.id);
  return null;
}

/** Called once a sign-in has fully succeeded on a device that was not trusted before. */
export async function welcomeNewDevice(userId: string, email: string | undefined, ctx: Ctx, event: string) {
  await trustDevice(userId, ctx);
  await logEvent(userId, ctx, event);
  if (email) await sendNewSigninAlert(email, ctx).catch(() => null);
}

export async function cleanupSecurityData() {
  const db = createAdminClient();
  const now = new Date().toISOString();
  await db.from('device_challenges').delete().lt('expires_at', new Date(Date.now() - DAY).toISOString());
  await db.from('trusted_devices').delete().lt('expires_at', now);
  await db.from('login_events').delete().lt('created_at', new Date(Date.now() - 90 * DAY).toISOString());
}
