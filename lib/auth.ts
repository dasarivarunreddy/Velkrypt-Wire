import 'server-only';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { SV_COOKIE, hasVerifiedFactor, jwtClaims, sessionGate, type Gate } from '@/lib/security/session';

import { can, isOwner, isStaffRole, type Perm, type Role } from '@/lib/permissions';

export type Profile = {
  id: string;
  display_name: string | null;
  role: Role;
  permissions: string[];
  is_premium: boolean;
  stripe_customer_id: string | null;
  subscription_status: string | null;
};

/**
 * The signed-in visitor, but only once every security step is done
 * (authenticator code and/or new-device code). Half-finished sign-ins count as signed out.
 */
export async function getSession() {
  const supabase = await createClient();
  const none = { supabase, user: null, profile: null as Profile | null, pending: null as Exclude<Gate, 'ok'> | null };
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return none;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return none;
  const gate = await sessionGate(supabase, user, (await cookies()).get(SV_COOKIE)?.value);
  if (gate !== 'ok') return { ...none, pending: gate };
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single<Profile>();
  return { supabase, user, profile: profile ?? null, pending: null };
}

export const isStaff = (p: Profile | null) => !!p && isStaffRole(p.role);
export { can, isOwner };
export const isMember = (p: Profile | null) => !!p && (p.is_premium || isStaff(p));

export async function requireUser(next = '/account') {
  const s = await getSession();
  if (!s.user && s.pending) redirect(`/login/${s.pending === 'mfa' ? 'mfa' : 'verify'}?next=${encodeURIComponent(next)}`);
  if (!s.user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return s as typeof s & { user: NonNullable<typeof s.user> };
}

/** Current and possible assurance level: aal1 = password only, aal2 = password + authenticator code. */
export async function getAal() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: { session } } = await supabase.auth.getSession();
  const current = jwtClaims(session?.access_token)?.aal === 'aal2' ? 'aal2' : 'aal1';
  return { current, next: user && hasVerifiedFactor(user) ? 'aal2' : 'aal1' };
}

/** Staff pages need 2FA: no authenticator yet -> set one up; has one but not verified this session -> enter code. */
export async function requireStaff(path = '/admin', perm?: Perm) {
  const s = await requireUser(path);
  if (!isStaff(s.profile)) redirect('/');
  const aal = await getAal();
  if (aal.current !== 'aal2') {
    if (aal.next === 'aal2') redirect(`/login/mfa?next=${encodeURIComponent(path)}`);
    redirect('/account/security?required=1');
  }
  if (perm && !can(s.profile, perm)) redirect(`/admin?error=${encodeURIComponent('You do not have permission for that. Ask the site owner.')}`);
  return s;
}

/** Only the owner. */
export async function requireOwner(path = '/admin') {
  const s = await requireStaff(path);
  if (!isOwner(s.profile)) redirect(`/admin?error=${encodeURIComponent('Only the site owner can do that.')}`);
  return s;
}
