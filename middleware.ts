import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-edge';

export async function middleware(req: NextRequest) {
  const { nextUrl } = req;
  const session = await getSession(req as unknown as Request);
  const isLoggedIn = !!session;
  const isProtected = nextUrl.pathname.startsWith('/profile');
  const isLoginPage = nextUrl.pathname === '/login';

  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL('/login', nextUrl.origin);
    loginUrl.searchParams.set('callbackUrl', nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoginPage && isLoggedIn) {
    return NextResponse.redirect(new URL('/', nextUrl.origin));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth).*)'],
};
