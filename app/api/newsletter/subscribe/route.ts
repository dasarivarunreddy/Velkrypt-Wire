import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendConfirmEmail } from '@/lib/email';
import { rateLimit } from '@/lib/ratelimit';

const OK = 'Check your inbox and click the link to confirm your subscription.';

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!rateLimit(`sub:${ip}`, 5)) return NextResponse.json({ message: 'Too many attempts. Try again in an hour.' }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const email = String(body.email || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 254) {
    return NextResponse.json({ message: 'Enter a valid email address.' }, { status: 400 });
  }

  const db = createAdminClient();
  const { data: existing } = await db.from('subscribers').select('status').eq('email', email).maybeSingle();
  // Same reply whether or not the address is already subscribed, so the form cannot be used to test emails.
  if (existing?.status === 'active') return NextResponse.json({ message: OK });

  const token = crypto.randomUUID();
  const { error } = await db.from('subscribers').upsert({ email, status: 'pending', token }, { onConflict: 'email' });
  if (error) return NextResponse.json({ message: 'Could not save your subscription. Try again shortly.' }, { status: 500 });

  try { await sendConfirmEmail(email, token); }
  catch { return NextResponse.json({ message: 'Saved, but the confirmation email failed to send. Try again shortly.' }, { status: 502 }); }
  return NextResponse.json({ message: OK });
}
