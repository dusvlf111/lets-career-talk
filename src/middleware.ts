import { NextResponse, type NextRequest } from 'next/server';

import { SESSION_COOKIE, verifySession } from '@/lib/session';

const PUBLIC_PATHS = ['/login', '/signup'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  const isPublic = PUBLIC_PATHS.includes(pathname);

  if (pathname.startsWith('/api/')) {
    return session
      ? NextResponse.next()
      : NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }
  if (!session && !isPublic) return NextResponse.redirect(new URL('/login', req.url));
  if (session && isPublic) return NextResponse.redirect(new URL('/', req.url));
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
