/**
 * D1 Database helper
 * In Cloudflare Pages, DB is injected via wrangler binding.
 * In development, we fall back to in-memory stubs.
 */

export function getDB(): D1Database | null {
  // @ts-ignore - Cloudflare Pages injects this at runtime
  return (globalThis as any).DB ?? null;
}

export function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

export function generateId(): string {
  return crypto.randomUUID();
}

// ── Users ─────────────────────────────────────────────────────────────────

export async function upsertUser(
  db: D1Database,
  params: {
    email: string;
    name: string | null;
    avatar: string | null;
    googleId: string | null;
  }
): Promise<string> {
  const now = Date.now();
  const id = generateId();

  await db
    .prepare(
      `INSERT INTO users (id, email, name, avatar, google_id, subscription_tier, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'free', ?, ?)
       ON CONFLICT(email) DO UPDATE SET
         name = excluded.name,
         avatar = excluded.avatar,
         google_id = excluded.google_id,
         updated_at = excluded.updated_at`
    )
    .bind(id, params.email, params.name, params.avatar, params.googleId, now, now)
    .run();

  const row = await db
    .prepare('SELECT id FROM users WHERE email = ?')
    .bind(params.email)
    .first<{ id: string }>();

  return row!.id;
}

export async function getUserByEmail(
  db: D1Database,
  email: string
) {
  return db
    .prepare('SELECT * FROM users WHERE email = ?')
    .bind(email)
    .first<{
      id: string;
      email: string;
      name: string | null;
      subscription_tier: string;
      subscription_expires_at: number | null;
    }>();
}

export async function updateUserSubscription(
  db: D1Database,
  email: string,
  tier: 'free' | 'pro',
  expiresAt: number | null
) {
  await db
    .prepare(
      'UPDATE users SET subscription_tier = ?, subscription_expires_at = ?, updated_at = ? WHERE email = ?'
    )
    .bind(tier, expiresAt, Date.now(), email)
    .run();
}

// ── Usage ──────────────────────────────────────────────────────────────────

export async function getUsageCount(
  db: D1Database,
  params: { userId?: string; ip?: string }
): Promise<number> {
  const today = getTodayString();
  if (params.userId) {
    const row = await db
      .prepare('SELECT count FROM usage_records WHERE user_id = ? AND date = ?')
      .bind(params.userId, today)
      .first<{ count: number }>();
    return row?.count ?? 0;
  } else {
    const row = await db
      .prepare('SELECT count FROM usage_records WHERE ip_address = ? AND date = ?')
      .bind(params.ip, today)
      .first<{ count: number }>();
    return row?.count ?? 0;
  }
}

export async function incrementUsage(
  db: D1Database,
  params: { userId?: string; ip?: string }
): Promise<number> {
  const today = getTodayString();
  const now = Date.now();
  const id = generateId();

  if (params.userId) {
    await db
      .prepare(
        `INSERT INTO usage_records (id, user_id, date, count, created_at)
         VALUES (?, ?, ?, 1, ?)
         ON CONFLICT(user_id, date) DO UPDATE SET count = count + 1`
      )
      .bind(id, params.userId, today, now)
      .run();

    const row = await db
      .prepare('SELECT count FROM usage_records WHERE user_id = ? AND date = ?')
      .bind(params.userId, today)
      .first<{ count: number }>();
    return row?.count ?? 1;
  } else {
    await db
      .prepare(
        `INSERT INTO usage_records (id, ip_address, date, count, created_at)
         VALUES (?, ?, ?, 1, ?)
         ON CONFLICT(ip_address, date) DO UPDATE SET count = count + 1`
      )
      .bind(id, params.ip, today, now)
      .run();

    const row = await db
      .prepare('SELECT count FROM usage_records WHERE ip_address = ? AND date = ?')
      .bind(params.ip, today)
      .first<{ count: number }>();
    return row?.count ?? 1;
  }
}

// ── History ────────────────────────────────────────────────────────────────

export async function addNameHistory(
  db: D1Database,
  params: {
    userId: string;
    originalName: string | null;
    gender: string | null;
    birthday: string | null;
    generatedNames: object[];
  }
) {
  await db
    .prepare(
      `INSERT INTO name_history (id, user_id, original_name, gender, birthday, generated_names, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      generateId(),
      params.userId,
      params.originalName,
      params.gender,
      params.birthday,
      JSON.stringify(params.generatedNames),
      Date.now()
    )
    .run();
}

export async function getNameHistory(
  db: D1Database,
  userId: string,
  limitDays: number
): Promise<Array<{
  id: string;
  original_name: string | null;
  gender: string | null;
  birthday: string | null;
  generated_names: string;
  created_at: number;
}>> {
  const since = Date.now() - limitDays * 24 * 60 * 60 * 1000;
  const rows = await db
    .prepare(
      'SELECT * FROM name_history WHERE user_id = ? AND created_at > ? ORDER BY created_at DESC LIMIT 50'
    )
    .bind(userId, since)
    .all();
  return (rows.results ?? []) as any[];
}

// ── Favorites ──────────────────────────────────────────────────────────────

export async function addFavorite(
  db: D1Database,
  params: {
    userId: string;
    chineseName: string;
    pinyin: string | null;
    meaning: string | null;
    style: string | null;
  }
) {
  await db
    .prepare(
      `INSERT INTO favorites (id, user_id, chinese_name, pinyin, meaning, style, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      generateId(),
      params.userId,
      params.chineseName,
      params.pinyin,
      params.meaning,
      params.style,
      Date.now()
    )
    .run();
}

export async function removeFavorite(
  db: D1Database,
  userId: string,
  chineseName: string
) {
  await db
    .prepare('DELETE FROM favorites WHERE user_id = ? AND chinese_name = ?')
    .bind(userId, chineseName)
    .run();
}

export async function getFavorites(
  db: D1Database,
  userId: string
): Promise<Array<{
  id: string;
  chinese_name: string;
  pinyin: string | null;
  meaning: string | null;
  style: string | null;
  created_at: number;
}>> {
  const rows = await db
    .prepare('SELECT * FROM favorites WHERE user_id = ? ORDER BY created_at DESC')
    .bind(userId)
    .all();
  return (rows.results ?? []) as any[];
}

export async function getFavoriteCount(db: D1Database, userId: string): Promise<number> {
  const row = await db
    .prepare('SELECT COUNT(*) as cnt FROM favorites WHERE user_id = ?')
    .bind(userId)
    .first<{ cnt: number }>();
  return row?.cnt ?? 0;
}
