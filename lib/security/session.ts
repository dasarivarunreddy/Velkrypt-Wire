// Edge-safe (used by middleware and server code). Decides whether a signed-in
// session has finished every security step.
import type { SupabaseClient, User } from '@supabase/supabase-js';

export const SV_COOKIE = 'vw_sv';   // proof that this session passed the device check
export const DEV_COOKIE = 'vw_dev'; // remembers a trusted browser for 30 days

const enc = new TextEncoder();

function b64urlDecode(s: string) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return atob(s);
}
function b64url(bytes: Uint8Array) {
  let s = '';
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export function jwtClaims(token?: string | null): Record<string, unknown> | null {
  try { return JSON.parse(b64urlDecode(token!.split('.')[1])); } catch { return null; }
}

let keyPromise: Promise<CryptoKey> | null = null;
function hmacKey() {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set.');
  keyPromise ??= crypto.subtle.importKey('raw', enc.encode(`vw-session-proof-v1:${secret}`), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return keyPromise;
}

/** Signed value tied to one Supabase session. Cannot be forged without the server secret. */
export async function proofFor(sessionId: string) {
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(), enc.encode(sessionId));
  return b64url(new Uint8Array(sig));
}

export type Gate = 'ok' | 'mfa' | 'device';

/** True if the user has a working authenticator. Uses the server-verified user from getUser(), never the cookie copy. */
export const hasVerifiedFactor = (user: User) => (user.factors ?? []).some((f) => f.status === 'verified');

/**
 * 'mfa' = needs authenticator code, 'device' = needs emailed device code, 'ok' = fully signed in.
 * `user` must come from supabase.auth.getUser() (validated by Supabase), so a tampered cookie cannot skip a step.
 * The access token's aal and session_id claims are trusted because getUser() validated that same token.
 */
export async function sessionGate(supabase: SupabaseClient, user: User, proofCookie?: string): Promise<Gate> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return 'ok';
  const claims = jwtClaims(session.access_token);
  if (claims?.aal === 'aal2') return 'ok'; // authenticator app beats an emailed code
  if (hasVerifiedFactor(user)) return 'mfa';
  const sid = typeof claims?.session_id === 'string' ? claims.session_id : null;
  if (!sid || !proofCookie) return 'device';
  return safeEqual(proofCookie, await proofFor(sid)) ? 'ok' : 'device';
}
