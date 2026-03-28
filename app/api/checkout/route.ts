import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getStripe, STRIPE_PRICES } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Login required' }, { status: 401 });
  }

  const body = await req.json() as { plan?: string };
  const plan = body.plan as 'monthly' | 'yearly';

  if (!['monthly', 'yearly'].includes(plan)) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
  }

  const priceId = STRIPE_PRICES[plan];
  if (!priceId) {
    return NextResponse.json({ error: 'Price not configured' }, { status: 500 });
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? 'https://chinanam.online';

  const checkoutSession = await getStripe().checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer_email: session.user.email,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/profile?success=1`,
    cancel_url: `${baseUrl}/pricing?canceled=1`,
    metadata: {
      userEmail: session.user.email,
      plan,
    },
    subscription_data: {
      metadata: {
        userEmail: session.user.email,
        plan,
      },
    },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
