import { NextResponse, type NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { stripe } from '@/lib/stripe';
import { sameOrigin } from '@/lib/origin';
import { SITE } from '@/lib/site';

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { user, profile } = await getSession();
  if (!user || !profile?.stripe_customer_id) return NextResponse.redirect(new URL('/account', req.url), 303);
  try {
    const session = await stripe().billingPortal.sessions.create({ customer: profile.stripe_customer_id, return_url: `${SITE.url}/account` });
    return NextResponse.redirect(session.url, 303);
  } catch {
    return NextResponse.redirect(new URL('/account?error=Billing%20portal%20is%20unavailable.%20Try%20again%20shortly.', req.url), 303);
  }
}
