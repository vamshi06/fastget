// Server-side session guards. Single source of truth for "who is allowed here".
//
// Use these in Route Handlers and Server Components for defense-in-depth so that
// authorization does NOT rely on middleware alone (middleware can be bypassed —
// see Next.js CVE-2025-29927). They read the same HMAC-signed `fastget_session`
// cookie that middleware checks.

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import { verifySessionToken, SESSION_COOKIE_NAME, type SessionPayload } from '@/lib/session';

export type Role = 'customer' | 'agent' | 'admin';

/**
 * Read and verify the current session from the request cookies.
 * Returns null when there is no cookie or the signature/expiry is invalid.
 */
export async function getSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/**
 * Route-handler guard. Returns the verified session, or a ready-to-return 401.
 *
 *   const auth = await requireRole('admin');
 *   if ('response' in auth) return auth.response;
 *   // auth.session.userId / auth.session.role are now safe to use
 */
export async function requireRole(
  ...roles: Role[]
): Promise<{ session: SessionPayload } | { response: NextResponse }> {
  const session = await getSession();
  if (!session || !roles.includes(session.role as Role)) {
    return {
      response: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }),
    };
  }
  return { session };
}

/**
 * Route-handler guard for "must be logged in" (any role). Returns the verified
 * session, or a ready-to-return 401. Used by customer-owned data endpoints so
 * the user id comes from the cookie, never from the request (IDOR fix).
 */
export async function requireSession(): Promise<
  { session: SessionPayload } | { response: NextResponse }
> {
  const session = await getSession();
  if (!session) {
    return {
      response: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }),
    };
  }
  return { session };
}

/**
 * Server-component guard. Redirects to the admin login when the visitor is not
 * an authenticated admin; otherwise returns the session.
 */
export async function requireAdminPage(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    redirect('/admin/login');
  }
  return session;
}
