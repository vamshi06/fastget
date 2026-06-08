import { NextRequest, NextResponse } from 'next/server';

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const COOKIE_NAME = 'admin_token';
const COOKIE_MAX_AGE = 60 * 60 * 8; // 8 hours

/**
 * Constant-time string comparison to prevent timing attacks.
 * Uses manual XOR loop because edge runtime lacks node:crypto.
 */
function timingSafeEqual(a: string, b: string): boolean {
  const aBytes = new TextEncoder().encode(a);
  const bBytes = new TextEncoder().encode(b);
  if (aBytes.length !== bBytes.length) {
    // Do dummy work so the branch doesn't leak timing info based on length
    let dummy = 0;
    for (let i = 0; i < aBytes.length; i++) dummy |= aBytes[i];
    return false;
  }
  let diff = 0;
  for (let i = 0; i < aBytes.length; i++) {
    diff |= aBytes[i] ^ bBytes[i];
  }
  return diff === 0;
}

function getToken(request: NextRequest): string | undefined {
  // Prefer HttpOnly cookie; fall back to URL param / header for first-login redirect
  return (
    request.cookies.get(COOKIE_NAME)?.value ||
    request.nextUrl.searchParams.get('token') ||
    request.headers.get('x-admin-token') ||
    undefined
  );
}

function isAuthorized(token: string | undefined): boolean {
  return !!ADMIN_TOKEN && !!token && timingSafeEqual(token, ADMIN_TOKEN);
}

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isApiPath = path.startsWith('/api/');

  const requiresAuth =
    path.startsWith('/admin') ||
    path === '/agent-dashboard' ||
    path.startsWith('/agent/') ||
    path === '/api/orders/pending' ||
    path === '/api/init-db';

  if (!requiresAuth) {
    return NextResponse.next();
  }

  const token = getToken(request);

  if (!isAuthorized(token)) {
    // API routes must return JSON 401, not a redirect
    if (isApiPath) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/admin-login', request.url));
  }

  const response = NextResponse.next();
  response.headers.set('Cache-Control', 'no-store');

  // Promote a URL/header token to an HttpOnly cookie so the token stops
  // appearing in URLs and browser history after the first authenticated request.
  if (!request.cookies.has(COOKIE_NAME)) {
    response.cookies.set(COOKIE_NAME, token!, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
    });
  }

  return response;
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/agent-dashboard',
    '/agent/:path*',
    '/api/orders/pending',
    '/api/init-db',
  ],
};
