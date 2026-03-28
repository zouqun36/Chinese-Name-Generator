import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { USAGE_LIMITS } from '@/lib/types';
import { getDB, getUsageCount, incrementUsage, getUserByEmail } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Fallback in-memory store (dev / when D1 not available)
const memUsage = new Map<string, number>();

function getTodayKey(id: string) {
  return `${id}:${new Date().toISOString().split('T')[0]}`;
}

async function resolveTier(email: string): Promise<'free' | 'pro'> {
  const db = getDB();
  if (!db) return 'free';
  const user = await getUserByEmail(db, email);
  if (!user) return 'free';
  if (
    user.subscription_tier === 'pro' &&
    user.subscription_expires_at &&
    user.subscription_expires_at > Date.now()
  ) {
    return 'pro';
  }
  return 'free';
}

export async function GET(req: NextRequest) {
  const session = await auth();
  const db = getDB();

  let used = 0;
  let tier: 'anonymous' | 'free' | 'pro';

  if (session?.user?.email) {
    const email = session.user.email;
    tier = await resolveTier(email);
    if (db) {
      const user = await getUserByEmail(db, email);
      used = user ? await getUsageCount(db, { userId: user.id }) : 0;
    } else {
      used = memUsage.get(getTodayKey(email)) ?? 0;
    }
  } else {
    tier = 'anonymous';
    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown';
    if (db) {
      used = await getUsageCount(db, { ip });
    } else {
      used = memUsage.get(getTodayKey(`ip:${ip}`)) ?? 0;
    }
  }

  const limit = USAGE_LIMITS[tier];
  const remaining = Math.max(0, limit - used);
  return NextResponse.json({ used, limit, remaining, tier, canGenerate: remaining > 0 });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const db = getDB();

  let used = 0;
  let tier: 'anonymous' | 'free' | 'pro';
  let userId: string | undefined;

  if (session?.user?.email) {
    const email = session.user.email;
    tier = await resolveTier(email);
    if (db) {
      const user = await getUserByEmail(db, email);
      userId = user?.id;
      used = userId ? await getUsageCount(db, { userId }) : 0;
    } else {
      used = memUsage.get(getTodayKey(email)) ?? 0;
    }
  } else {
    tier = 'anonymous';
    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown';
    if (db) {
      used = await getUsageCount(db, { ip });
    } else {
      used = memUsage.get(getTodayKey(`ip:${ip}`)) ?? 0;
    }
  }

  const limit = USAGE_LIMITS[tier];
  if (used >= limit) {
    return NextResponse.json({ error: 'Daily limit reached', tier, limit }, { status: 429 });
  }

  // Increment
  if (db) {
    if (userId) {
      used = await incrementUsage(db, { userId });
    } else {
      const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown';
      used = await incrementUsage(db, { ip });
    }
  } else {
    const key = session?.user?.email
      ? getTodayKey(session.user.email)
      : getTodayKey(`ip:${req.headers.get('x-forwarded-for') ?? 'unknown'}`);
    used = (memUsage.get(key) ?? 0) + 1;
    memUsage.set(key, used);
  }

  const remaining = Math.max(0, limit - used);
  return NextResponse.json({ used, limit, remaining, tier, canGenerate: remaining > 0 });
}
