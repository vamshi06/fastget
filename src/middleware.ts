import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/session';

// Single source of truth for route protection (runs in the Edge runtime).
//
// Back-office surfaces — the admin panel, the agent dashboard, the all-orders
// APIs, and the DB-init route — all require an authenticated admin session.
//
// NOTE: per-order agent links (/agent/[token]) are intentionally NOT matched.
// They authorize via an unguessable capability token validated by the route
// itself, so a delivery agent can open their single order without an account.
export const config = {
  matcher: [
    '/admin/:path*',
    '/agent-dashboard',
    '/api/orders/pending',
    '/api/init-db',
  ],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // The admin login page must stay public, otherwise no one could ever sign in.
  if (pathname === '/admin/login') return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session || session.role !== 'admin') {
    // API routes get a JSON 401; page routes get redirected to the login screen.
    if (pathname.startsWith('/api/') || pathname.startsWith('/admin/api/')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.next();
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
