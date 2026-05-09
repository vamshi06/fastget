import { NextRequest, NextResponse } from 'next/server';

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'admin-secret-token';

export function middleware(request: NextRequest) {
  // Protect /admin routes with a simple token-based auth
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const token = request.nextUrl.searchParams.get('token') || 
                  request.headers.get('x-admin-token') || 
                  request.cookies.get('admin_token')?.value;

    if (token !== ADMIN_TOKEN) {
      return NextResponse.redirect(new URL('/admin-login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
