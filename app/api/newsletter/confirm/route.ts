import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendWelcomeEmail } from '@/lib/email';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') || '';
  const to = (s: string) => NextResponse.redirect(new URL(`/newsletter/confirmed?s=${s}`, req.url));
  if (!UUID.test(token)) return to('invalid');
  const db = createAdminClient();
  const { data } = await db.from('subscribers').update({ status: 'active', confirmed_at: new Date().toISOString() })
    .eq('token', token).eq('status', 'pending').select('email,token').maybeSingle();
  if (!data) return to('invalid');
  await sendWelcomeEmail(data.email, data.token).catch(() => null);
  return to('confirmed');
}
