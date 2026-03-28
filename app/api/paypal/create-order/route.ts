import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

const PAYPAL_API = process.env.PAYPAL_MODE === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

const PLANS = {
  monthly: { amount: '2.99', description: 'Chinese Name Generator Pro - Monthly', days: 31 },
  yearly:  { amount: '19.99', description: 'Chinese Name Generator Pro - Yearly', days: 366 },
};

async function getPayPalToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID!;
  const secret = process.env.PAYPAL_CLIENT_SECRET!;
  const credentials = btoa(`${clientId}:${secret}`);

  const res = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const data = await res.json() as any;
  return data.access_token;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Login required' }, { status: 401 });
  }

  const body = await req.json() as any;
  const plan = body.plan as 'monthly' | 'yearly';

  if (!PLANS[plan]) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
  }

  const { amount, description } = PLANS[plan];
  const baseUrl = process.env.NEXTAUTH_URL ?? 'https://chinanam.online';

  try {
    const token = await getPayPalToken();

    const orderRes = await fetch(`${PAYPAL_API}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: { currency_code: 'USD', value: amount },
          description,
          custom_id: `${session.user.email}|${plan}`,
        }],
        application_context: {
          return_url: `${baseUrl}/paypal-success?plan=${plan}`,
          cancel_url: `${baseUrl}/pricing?canceled=1`,
          brand_name: 'Chinese Name Generator',
          landing_page: 'NO_PREFERENCE',
          user_action: 'PAY_NOW',
        },
      }),
    });

    const order = await orderRes.json() as any;

    if (order.id) {
      const approveUrl = order.links?.find((l: any) => l.rel === 'approve')?.href;
      return NextResponse.json({ orderId: order.id, approveUrl });
    } else {
      console.error('PayPal order creation failed:', order);
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
    }
  } catch (err) {
    console.error('PayPal error:', err);
    return NextResponse.json({ error: 'PayPal service error' }, { status: 500 });
  }
}
