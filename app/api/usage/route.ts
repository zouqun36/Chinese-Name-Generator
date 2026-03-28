import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { USAGE_LIMITS } from '@/lib/types';
import { userSubscriptions } from '@/lib/subscriptionStore';

export const dynamic = 'force-dynamic';

// In-memory usage store (replace with D1 in production)
const usageStore = new Map<string, { count: number; date: string }>();

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

function getKey(identifier: string): string {
  return `${identifier}:${getTodayString()}`;
}

function getTier(email: string | null | undefined): 'anonymous' | 'free' | 'pro' {
  if (!email) return 'anonymous';
  const sub = userSubscriptions.get(email);
  if (sub && sub.expiresAt > Date.now()) return 'pro';
  return 'free';
}

export async function GET(req: NextRequest) {
  const session = await auth();
  const today = getTodayString();

  let identifier: string;
  let tier: 'anonymous' | 'free' | 'pro';

  if (session?.user?.email) {
    identifier = session.user.email;
    tier = getTier(session.user.email);
  } else {
    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown';
    identifier = `ip:${ip}`;
    tier = 'anonymous';
  }

  const key = getKey(identifier);
  const usage = usageStore.get(key) ?? { count: 0, date: today };
  const limit = USAGE_LIMITS[tier];
  const remaining = Math.max(0, limit - usage.count);

  return NextResponse.json({
    used: usage.count,
    limit,
    remaining,
    tier,
    canGenerate: remaining > 0,
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const today = getTodayString();

  let identifier: string;
  let tier: 'anonymous' | 'free' | 'pro';

  if (session?.user?.email) {
    identifier = session.user.email;
    tier = getTier(session.user.email);
  } else {
    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown';
    identifier = `ip:${ip}`;
    tier = 'anonymous';
  }

  const key = getKey(identifier);
  const usage = usageStore.get(key) ?? { count: 0, date: today };
  const limit = USAGE_LIMITS[tier];

  if (usage.count >= limit) {
    return NextResponse.json(
      { error: 'Daily limit reached', tier, limit },
      { status: 429 }
    );
  }

  usage.count += 1;
  usageStore.set(key, usage);

  return NextResponse.json({
    used: usage.count,
    limit,
    remaining: limit - usage.count,
    tier,
    canGenerate: usage.count < limit,
  });
}
