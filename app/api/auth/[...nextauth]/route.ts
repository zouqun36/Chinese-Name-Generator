import { NextRequest, NextResponse } from 'next/server';
import { signJWT, verifyJWT, createSessionCookie, clearSessionCookie } from '@/lib/auth-edge';
import { getDB, upsertUser } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const SECRET = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? '';

function getBaseUrl(req: NextRequest): string {
  const host = req.headers.get('host') ?? 'chinanam.online';
  const proto = req.headers.get('x-forwarded-proto') ?? 'https';
  return `${proto}://${host}`;
}

// GET /api/auth/signin — redirect to Google
// GET /api/auth/callback/google — handle Google callback
// GET /api/auth/signout — clear session
// GET /api/auth/session — return current session JSON
// GET /api/auth/providers — return providers JSON (NextAuth compat)

export async function GET(req: NextRequest, context: any) {
  const action: string[] = context?.params?.nextauth ?? [];
  const baseUrl = getBaseUrl(req);
  const callbackUrl = `${baseUrl}/api/auth/callback/google`;

  // /api/auth/providers — NextAuth compatibility for client SDK
  if (action[0] === 'providers') {
    return NextResponse.json({
      google: {
        id: 'google',
        name: 'Google',
        type: 'oauth',
        signinUrl: `${baseUrl}/api/auth/signin/google`,
        callbackUrl,
      },
    });
  }

  // /api/auth/session — return current session
  if (action[0] === 'session') {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ user: null, expires: null });
    const exp = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    return NextResponse.json({ user: session, expires: exp });
  }

  // /api/auth/csrf — stub for NextAuth client compat
  if (action[0] === 'csrf') {
    return NextResponse.json({ csrfToken: crypto.randomUUID() });
  }

  // /api/auth/signin or /api/auth/signin/google
  if (action[0] === 'signin') {
    const url = req.nextUrl.searchParams.get('callbackUrl') ?? '/';
    const state = await signJWT({ callbackUrl: url, nonce: crypto.randomUUID() }, SECRET);
    const googleUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    googleUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
    googleUrl.searchParams.set('redirect_uri', callbackUrl);
    googleUrl.searchParams.set('response_type', 'code');
    googleUrl.searchParams.set('scope', 'openid email profile');
    googleUrl.searchParams.set('state', state);
    googleUrl.searchParams.set('prompt', 'select_account');
    return NextResponse.redirect(googleUrl.toString());
  }

  // /api/auth/callback/google
  if (action[0] === 'callback' && action[1] === 'google') {
    const code = req.nextUrl.searchParams.get('code');
    const state = req.nextUrl.searchParams.get('state');

    if (!code) return NextResponse.redirect(`${baseUrl}/?error=no_code`);

    // Verify state
    let redirectTo = '/';
    if (state) {
      const stateData = await verifyJWT<{ callbackUrl: string }>(state, SECRET);
      if (stateData?.callbackUrl) redirectTo = stateData.callbackUrl;
    }

    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: callbackUrl,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenRes.json() as any;
    if (!tokens.access_token) {
      console.error('Token exchange failed:', tokens);
      return NextResponse.redirect(`${baseUrl}/?error=token_exchange_failed`);
    }

    // Get user info
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const googleUser = await userRes.json() as any;

    if (!googleUser.email) {
      return NextResponse.redirect(`${baseUrl}/?error=no_email`);
    }

    // Upsert to D1
    const db = getDB();
    if (db) {
      try {
        await upsertUser(db, {
          email: googleUser.email,
          name: googleUser.name ?? null,
          avatar: googleUser.picture ?? null,
          googleId: googleUser.id ?? null,
        });
      } catch (err) {
        console.error('D1 upsert error:', err);
      }
    }

    const user = {
      id: googleUser.id,
      email: googleUser.email,
      name: googleUser.name ?? null,
      image: googleUser.picture ?? null,
    };

    const cookie = await createSessionCookie(user, SECRET);
    const response = NextResponse.redirect(`${baseUrl}${redirectTo}`);
    response.headers.set('Set-Cookie', cookie);
    return response;
  }

  // /api/auth/signout
  if (action[0] === 'signout') {
    const response = NextResponse.redirect(`${baseUrl}/`);
    response.headers.set('Set-Cookie', clearSessionCookie());
    return response;
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 404 });
}

export async function POST(req: NextRequest, context: any) {
  const action: string[] = context?.params?.nextauth ?? [];
  const baseUrl = getBaseUrl(req);

  if (action[0] === 'signout') {
    const response = NextResponse.redirect(`${baseUrl}/`);
    response.headers.set('Set-Cookie', clearSessionCookie());
    return response;
  }

  // NextAuth client sends POST to /signin with callbackUrl
  if (action[0] === 'signin') {
    const body = await req.text();
    const params2 = new URLSearchParams(body);
    const callbackUrl = params2.get('callbackUrl') ?? '/';
    const callbackUri = `${baseUrl}/api/auth/callback/google`;
    const state = await signJWT({ callbackUrl, nonce: crypto.randomUUID() }, SECRET);
    const googleUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    googleUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
    googleUrl.searchParams.set('redirect_uri', callbackUri);
    googleUrl.searchParams.set('response_type', 'code');
    googleUrl.searchParams.set('scope', 'openid email profile');
    googleUrl.searchParams.set('state', state);
    googleUrl.searchParams.set('prompt', 'select_account');
    return NextResponse.json({ url: googleUrl.toString() });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 404 });
}

// Re-export getSession for use in other routes
async function getSession(req: NextRequest) {
  const { getSession: gs } = await import('@/lib/auth-edge');
  return gs(req);
}
