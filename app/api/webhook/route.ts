import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { userSubscriptions } from '@/lib/subscriptionStore';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const email = session.metadata?.userEmail ?? session.customer_email;
      if (email && session.subscription) {
        // Fetch subscription to get period end
        const sub = await getStripe().subscriptions.retrieve(session.subscription as string);
        const expiresAt = (sub as any).current_period_end * 1000; // ms
        userSubscriptions.set(email, { tier: 'pro', expiresAt });
        console.log(`✅ Upgraded ${email} to Pro until ${new Date(expiresAt).toISOString()}`);
      }
      break;
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const email = sub.metadata?.userEmail;
      if (email) {
        if (sub.status === 'active') {
          const expiresAt = (sub as any).current_period_end * 1000;
          userSubscriptions.set(email, { tier: 'pro', expiresAt });
          console.log(`🔄 Renewed ${email} until ${new Date(expiresAt).toISOString()}`);
        }
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const email = sub.metadata?.userEmail;
      if (email) {
        userSubscriptions.delete(email);
        console.log(`❌ Cancelled subscription for ${email}`);
      }
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
