import { NextRequest } from 'next/server';
import { getSession, SessionUser } from './auth-edge';

export async function getEdgeSession(req: NextRequest): Promise<{ user: SessionUser } | null> {
  const user = await getSession(req as unknown as Request);
  if (!user) return null;
  return { user };
}
