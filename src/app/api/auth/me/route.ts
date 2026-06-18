import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserById } from '@/lib/users';
import {
  createSessionToken,
  sessionCookieOptions,
  SESSION_COOKIE_NAME,
} from '@/lib/session';
import { logger } from '@/lib/logger';

/**
 * GET /api/auth/me
 *
 * Returns the currently authenticated user (from the verified fastget_session
 * cookie) so the client can reconcile its optimistic localStorage state with the
 * real server session. Used on app load to:
 *
 *  - confirm the user is still logged in (else the client clears its ghost state),
 *  - slide-refresh long-lived customer sessions so an active shopper isn't
 *    silently logged out mid-checkout (admin sessions keep their hard 8h expiry),
 *  - drop the cookie if it points to a user that no longer exists.
 *
 * Identity comes only from the signed cookie — never from the request.
 */
const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, authenticated: false },
      { status: 401, headers: NO_STORE },
    );
  }

  const user = await getUserById(session.userId);
  if (!user) {
    // Valid signature but the user is gone (deleted / DB reseeded). Clear the
    // stale cookie so the client stops presenting a logged-in state.
    logger.warn('Auth', 'me — session user no longer exists, clearing cookie', {
      userId: session.userId,
    });
    const res = NextResponse.json(
      { success: false, authenticated: false },
      { status: 401, headers: NO_STORE },
    );
    res.cookies.set(SESSION_COOKIE_NAME, '', { maxAge: 0, path: '/' });
    return res;
  }

  const res = NextResponse.json(
    {
      success: true,
      authenticated: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    },
    { headers: NO_STORE },
  );

  // Slide-refresh customer sessions only. Admin sessions intentionally keep a
  // hard 8h lifetime and are never extended on activity.
  if (user.role !== 'admin') {
    const token = await createSessionToken({ userId: user.id, role: user.role });
    res.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions(user.role));
  }

  return res;
}
