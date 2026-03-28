import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getDB, getUserByEmail, getNameHistory } from '@/lib/db';
import { HISTORY_LIMITS } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Login required' }, { status: 401 });
  }

  const db = getDB();
  if (!db) {
    return NextResponse.json({ history: [] });
  }

  const user = await getUserByEmail(db, session.user.email);
  if (!user) return NextResponse.json({ history: [] });

  const tier = user.subscription_tier === 'pro' &&
    user.subscription_expires_at &&
    (user.subscription_expires_at as unknown as number) > Date.now()
    ? 'pro' : 'free';

  const limitDays = HISTORY_LIMITS[tier as keyof typeof HISTORY_LIMITS];
  const history = await getNameHistory(db, user.id, limitDays);

  return NextResponse.json({
    history: history.map((h) => ({
      ...h,
      generatedNames: JSON.parse(h.generated_names),
    })),
  });
}
