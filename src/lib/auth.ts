// Server-side session guards. Single source of truth for "who is allowed here".
//
// Use these in Route Handlers and Server Components for defense-in-depth so that
// authorization does NOT rely on middleware alone (middleware can be bypassed -
// see Next.js CVE-2025-29927). They read the same HMAC-signed `fastget_session`
// cookie that middleware checks.

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import { getUnpooledConnection } from '@/lib/db';
import { logger } from '@/lib/logger';
import { verifySessionToken, SESSION_COOKIE_NAME, type SessionPayload } from '@/lib/session';

export type Role = 'customer' | 'agent' | 'admin';

/**
 * Read and verify the current session from the request cookies.
 * Returns null when there is no cookie, the signature/expiry is invalid, or
 * the session was revoked (see checkSessionAgainstDb).
 */
export async function getSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await verifySessionToken(token);
  if (!session) return null;
  return checkSessionAgainstDb(session);
}

/**
 * Signed tokens can't be recalled on their own, so check them against the
 * user row: the account must still exist, the token must not predate
 * users.sessions_valid_after (set on password reset - migration 029), and the
 * role comes from the DB so a demoted admin loses access immediately.
 *
 * Fails OPEN to the signed token on a DB error (including migration 029 not
 * run yet) - the signature is still verified, and the route's own queries
 * will fail anyway if the DB is really down.
 */
async function checkSessionAgainstDb(session: SessionPayload): Promise<SessionPayload | null> {
  try {
    // db.ts's client - it disables Next's fetch cache for Neon queries, which
    // would otherwise serve one user's row for another's lookup.
    const sql = getUnpooledConnection();
    const rows = (await sql`
      SELECT role, FLOOR(EXTRACT(EPOCH FROM sessions_valid_after))::bigint AS valid_after
      FROM users WHERE id = ${session.userId} LIMIT 1
    `) as { role: string; valid_after: string | number | null }[];
    if (rows.length === 0) return null;
    const { role, valid_after } = rows[0];
    if (valid_after != null && (session.iat ?? 0) < Number(valid_after)) return null;
    return { ...session, role };
  } catch (error) {
    logger.error('Auth', 'session DB check failed - using signed token only', {
      error: error instanceof Error ? error.message : String(error),
    });
    return session;
  }
}

/**
 * CSRF defense-in-depth (M7). The session cookie is SameSite=Lax (so it isn't
 * sent on cross-site POST/PUT/DELETE in the first place), but we also reject any
 * request a browser tags as cross-site. Same-origin / same-site / user-initiated
 * (`none`) requests pass; older browsers without Sec-Fetch-Site fall back to an
 * Origin-vs-Host comparison. Returns a 403 to return, or null when allowed.
 *
 * Applied inside requireRole/requireSession, so every cookie-authed endpoint
 * (admin CRUD, order status, addresses, wishlist) is covered in one place.
 */
async function crossOriginResponse(): Promise<NextResponse | null> {
  const h = await headers();
  const forbidden = () =>
    NextResponse.json({ success: false, error: 'Cross-origin request blocked' }, { status: 403 });

  const site = h.get('sec-fetch-site');
  if (site) {
    return site === 'cross-site' ? forbidden() : null;
  }

  // Fallback for clients that don't send Sec-Fetch-Site.
  const origin = h.get('origin');
  if (!origin) return null; // no Origin (non-browser / same-origin nav) - SameSite cookie is the backstop
  try {
    const host = h.get('host');
    if (host && new URL(origin).host === host) return null;
  } catch {
    /* malformed Origin → treat as cross-origin */
  }
  return forbidden();
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
  const csrf = await crossOriginResponse();
  if (csrf) return { response: csrf };
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
  const csrf = await crossOriginResponse();
  if (csrf) return { response: csrf };
  return { session };
}

/**
 * Server-component guard. Redirects to the common login page when the visitor
 * is not an authenticated admin; otherwise returns the session.
 */
export async function requireAdminPage(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    redirect('/login?redirect=/admin');
  }
  return session;
}
