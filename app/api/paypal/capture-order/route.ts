import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getDB, updateUserSubscription } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

const PAYPAL_API = process.env.PAYPAL_MODE === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

const PLAN_DAYS: Record<string, number> = {
  monthly: 31,
  yearly: 366,
};

async function getPayPalToken(): Promise<string> {
  const credentials = btoa(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`);
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
  const { orderId } = body;

  if (!orderId) {
    return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });
  }

  try {
    const token = await getPayPalToken();

    // Capture the order
    const captureRes = await fetch(`${PAYPAL_API}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const capture = await captureRes.json() as any;

    if (capture.status === 'COMPLETED') {
      // Extract plan from custom_id (format: email|plan)
      const customId = capture.purchase_units?.[0]?.payments?.captures?.[0]?.custom_id ?? '';
      const [, plan] = customId.split('|');
      const days = PLAN_DAYS[plan] ?? 31;
      const expiresAt = Date.now() + days * 24 * 60 * 60 * 1000;

      // Update D1
      const db = getDB();
      if (db) {
        await updateUserSubscription(db, session.user.email!, 'pro', expiresAt);
      }

      return NextResponse.json({
        success: true,
        plan,
        expiresAt,
        captureId: capture.purchase_units?.[0]?.payments?.captures?.[0]?.id,
      });
    } else {
      return NextResponse.json({ error: 'Payment not completed', status: capture.status }, { status: 400 });
    }
  } catch (err) {
    console.error('PayPal capture error:', err);
    return NextResponse.json({ error: 'Capture failed' }, { status: 500 });
  }
}
