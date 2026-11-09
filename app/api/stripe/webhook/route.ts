import { NextResponse, type NextRequest } from 'next/server';
import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
const ACTIVE = new Set(['active', 'trialing', 'past_due']);

// Stripe tells us when a subscription starts, changes or ends. The signature check proves the call is really from Stripe.
export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) return NextResponse.json({ error: 'Missing signature' }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await req.text(), sig, secret);
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const db = createAdminClient();
  if (event.type === 'checkout.session.completed') {
    const s = event.data.object as Stripe.Checkout.Session;
    if (s.client_reference_id && typeof s.customer === 'string') {
      await db.from('profiles').update({ stripe_customer_id: s.customer, is_premium: true, subscription_status: 'active' }).eq('id', s.client_reference_id);
    }
  }
  if (event.type.startsWith('customer.subscription.')) {
    const sub = event.data.object as Stripe.Subscription;
    const customer = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
    const status = event.type === 'customer.subscription.deleted' ? 'canceled' : sub.status;
    await db.from('profiles').update({ is_premium: ACTIVE.has(status), subscription_status: status }).eq('stripe_customer_id', customer);
  }
  return NextResponse.json({ received: true });
}
