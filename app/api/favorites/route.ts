import { NextRequest, NextResponse } from 'next/server';
import { getEdgeSession as auth } from '@/lib/session';
import { getDB, getUserByEmail, addFavorite, removeFavorite, getFavorites, getFavoriteCount } from '@/lib/db';
import { FAVORITE_LIMITS } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

// GET /api/favorites — list favorites
export async function GET(req: NextRequest) {
  const session = await auth(req);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Login required' }, { status: 401 });
  }

  const db = getDB();
  if (!db) {
    return NextResponse.json({ favorites: [] });
  }

  const user = await getUserByEmail(db, session.user.email);
  if (!user) return NextResponse.json({ favorites: [] });

  const favorites = await getFavorites(db, user.id);
  return NextResponse.json({ favorites });
}

// POST /api/favorites — add favorite
export async function POST(req: NextRequest) {
  const session = await auth(req);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Login required' }, { status: 401 });
  }

  const db = getDB();
  if (!db) {
    return NextResponse.json({ error: 'Database not available' }, { status: 503 });
  }

  const user = await getUserByEmail(db, session.user.email);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Check limit
  const tier = user.subscription_tier === 'pro' &&
    user.subscription_expires_at &&
    (user.subscription_expires_at as unknown as number) > Date.now()
    ? 'pro' : 'free';
  const limit = FAVORITE_LIMITS[tier as keyof typeof FAVORITE_LIMITS];
  const count = await getFavoriteCount(db, user.id);

  if (count >= limit) {
    return NextResponse.json(
      { error: `Favorite limit reached (${limit} max for ${tier})`, limit },
      { status: 429 }
    );
  }

  const body = await req.json() as any;
  await addFavorite(db, {
    userId: user.id,
    chineseName: body.chineseName,
    pinyin: body.pinyin ?? null,
    meaning: body.meaning ?? null,
    style: body.style ?? null,
  });

  return NextResponse.json({ success: true });
}

// DELETE /api/favorites — remove favorite
export async function DELETE(req: NextRequest) {
  const session = await auth(req);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Login required' }, { status: 401 });
  }

  const db = getDB();
  if (!db) {
    return NextResponse.json({ error: 'Database not available' }, { status: 503 });
  }

  const user = await getUserByEmail(db, session.user.email);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const body = await req.json() as any;
  await removeFavorite(db, user.id, body.chineseName);
  return NextResponse.json({ success: true });
}
