import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/session';

// Single source of truth for route protection (runs in the Edge runtime).
//
// Back-office surfaces - the admin panel, the agent dashboard, the all-orders
// APIs, and the DB-init route - all require an authenticated admin session.
//
// The agent management screens are staff-only - orders are processed by
// logged-in admins, not via account-less capability links (C4).
export const config = {
  matcher: [
    '/admin/:path*',
    '/agent-dashboard',
    '/agent/:path*',
    '/api/orders/pending',
    '/api/init-db',
  ],
};

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Admins sign in on the common /login page (same as customers, works in the
  // mobile app). The old /admin/login address forwards there for old bookmarks.
  if (pathname === '/admin/login') {
    const loginUrl = new URL('/login', request.url);
    const next = request.nextUrl.searchParams.get('next');
    loginUrl.searchParams.set('redirect', next && next.startsWith('/') && !next.startsWith('//') ? next : '/admin');
    return NextResponse.redirect(loginUrl);
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session || session.role !== 'admin') {
    // API routes get a JSON 401; page routes get redirected to the login screen.
    // Both must be no-store: browsers (and <Link> prefetch in particular) will
    // otherwise cache this "you're logged out" response and keep replaying it
    // after a successful login, sending an authenticated admin right back to
    // the login screen.
    if (pathname.startsWith('/api/') || pathname.startsWith('/admin/api/')) {
      const res = NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      res.headers.set('Cache-Control', 'no-store');
      return res;
    }
    // Back to the exact page (filters included) after signing in.
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname + search);
    const res = NextResponse.redirect(loginUrl);
    res.headers.set('Cache-Control', 'no-store');
    return res;
  }

  const response = NextResponse.next();
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
