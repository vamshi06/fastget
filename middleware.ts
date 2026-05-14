import { NextRequest, NextResponse } from 'next/server';

// SECURITY: No fallback value — if ADMIN_TOKEN is unset, all /admin routes are blocked.
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

export function middleware(request: NextRequest) {
  // Protect /admin routes with a simple token-based auth
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const token =
      request.nextUrl.searchParams.get('token') ||
      request.headers.get('x-admin-token') ||
      request.cookies.get('admin_token')?.value;

    if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
      return NextResponse.redirect(new URL('/admin-login', request.url));
    }

    // Prevent admin pages from being cached by browsers / CDNs
    const response = NextResponse.next();
    response.headers.set('Cache-Control', 'no-store');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
