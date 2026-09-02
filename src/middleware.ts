import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken, createSessionToken, SESSION_COOKIE_NAME } from '@/lib/session';

// TEMP DIAGNOSTIC: short, non-reversible fingerprint of the secret so we can
// compare "what the login handler used" vs "what middleware sees" without
// ever logging the secret itself.
async function secretFingerprint(): Promise<string> {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return 'MISSING';
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));
  return Array.from(new Uint8Array(digest).slice(0, 6))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Single source of truth for route protection (runs in the Edge runtime).
//
// Back-office surfaces — the admin panel, the agent dashboard, the all-orders
// APIs, and the DB-init route — all require an authenticated admin session.
//
// The agent management screens are staff-only — orders are processed by
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
  const { pathname } = request.nextUrl;

  // The admin login page must stay public, otherwise no one could ever sign in.
  if (pathname === '/admin/login') return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  // TEMP DIAGNOSTIC (remove once the deployed-only 307 bug is root-caused):
  // logs why a protected request was rejected, without leaking the token.
  if (!session || session.role !== 'admin') {
    let claimedRole: string | undefined;
    let claimedExp: number | undefined;
    try {
      const body = token?.split('.')[1];
      if (body) {
        const b64 = body.replace(/-/g, '+').replace(/_/g, '/');
        const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
        const parsed = JSON.parse(atob(padded));
        claimedRole = parsed.role;
        claimedExp = parsed.exp;
      }
    } catch {
      claimedRole = 'PARSE_ERROR';
    }
    // Self round-trip: sign + verify a throwaway token in THIS exact runtime,
    // right now. If this also fails, the bug is crypto/runtime, not a secret
    // mismatch between the login handler and middleware.
    let selfRoundTrip: string;
    try {
      const testToken = await createSessionToken({ userId: 'diag-selftest', role: 'admin' });
      const testVerify = await verifySessionToken(testToken);
      selfRoundTrip = testVerify?.role === 'admin' ? 'PASS' : 'FAIL-no-match';
    } catch (e) {
      selfRoundTrip = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
    }
    console.log('[mw-diag]', {
      pathname,
      hadCookie: Boolean(token),
      tokenPreview: token ? `${token.slice(0, 12)}...${token.slice(-6)}` : null,
      verifiedSession: session,
      claimedRole,
      claimedExp,
      nowSec: Math.floor(Date.now() / 1000),
      secretPresent: Boolean(process.env.ADMIN_SESSION_SECRET),
      secretLen: process.env.ADMIN_SESSION_SECRET?.length ?? 0,
      secretFp: await secretFingerprint(),
      selfRoundTrip,
    });
  }

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
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    const res = NextResponse.redirect(loginUrl);
    res.headers.set('Cache-Control', 'no-store');
    return res;
  }

  const response = NextResponse.next();
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
