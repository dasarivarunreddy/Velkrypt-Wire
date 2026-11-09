import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function unsubscribe(token: string) {
  if (!UUID.test(token)) return false;
  const { data } = await createAdminClient().from('subscribers').update({ status: 'unsubscribed' }).eq('token', token).select('id').maybeSingle();
  return !!data;
}

// Link in the email footer.
export async function GET(req: NextRequest) {
  const ok = await unsubscribe(req.nextUrl.searchParams.get('token') || '');
  return NextResponse.redirect(new URL(`/newsletter/confirmed?s=${ok ? 'unsubscribed' : 'invalid'}`, req.url));
}

// One-click unsubscribe from Gmail/Outlook (RFC 8058).
export async function POST(req: NextRequest) {
  await unsubscribe(req.nextUrl.searchParams.get('token') || '');
  return new NextResponse(null, { status: 200 });
}
