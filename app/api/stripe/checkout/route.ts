import { NextResponse, type NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { stripe } from '@/lib/stripe';
import { sameOrigin } from '@/lib/origin';
import { SITE } from '@/lib/site';

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { user, profile } = await getSession();
  if (!user) return NextResponse.redirect(new URL('/login?next=/membership', req.url), 303);
  if (!process.env.STRIPE_PRICE_ID) return NextResponse.redirect(new URL('/membership?error=Memberships%20are%20not%20open%20yet.', req.url), 303);

  try {
    const s = stripe();
    let customer = profile?.stripe_customer_id;
    if (!customer) {
      const c = await s.customers.create({ email: user.email, metadata: { user_id: user.id } });
      customer = c.id;
      await createAdminClient().from('profiles').update({ stripe_customer_id: customer }).eq('id', user.id);
    }
    const session = await s.checkout.sessions.create({
      mode: 'subscription',
      customer,
      client_reference_id: user.id,
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${SITE.url}/account?message=${encodeURIComponent('Welcome, member! Premium analysis is now unlocked.')}`,
      cancel_url: `${SITE.url}/membership?status=cancelled`,
    });
    return NextResponse.redirect(session.url!, 303);
  } catch {
    return NextResponse.redirect(new URL('/membership?error=Checkout%20could%20not%20start.%20Try%20again%20shortly.', req.url), 303);
  }
}
