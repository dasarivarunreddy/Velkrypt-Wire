import 'server-only';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type Profile = {
  id: string;
  display_name: string | null;
  role: 'reader' | 'editor' | 'admin';
  is_premium: boolean;
  stripe_customer_id: string | null;
  subscription_status: string | null;
};

export async function getSession() {
  const supabase = await createClient();
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return { supabase, user: null, profile: null as Profile | null };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null as Profile | null };
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single<Profile>();
  return { supabase, user, profile: profile ?? null };
}

export const isStaff = (p: Profile | null) => !!p && (p.role === 'admin' || p.role === 'editor');
export const isMember = (p: Profile | null) => !!p && (p.is_premium || isStaff(p));

export async function requireUser(next = '/account') {
  const s = await getSession();
  if (!s.user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return s as typeof s & { user: NonNullable<typeof s.user> };
}

export async function requireStaff() {
  const s = await requireUser('/admin');
  if (!isStaff(s.profile)) redirect('/');
  return s;
}
