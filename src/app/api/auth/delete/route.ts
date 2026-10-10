import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { deleteUser, getUserById, verifyPassword } from '@/lib/users';
import { SESSION_COOKIE_NAME } from '@/lib/session';
import { peekLimit, recordFailedAttempt, type RateRule } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

/**
 * DELETE /api/auth/delete
 *
 * Delete the logged-in user's account and all associated data.
 * The account comes from the session cookie (never the request body - a
 * body userId let anyone guess passwords for any account here, with no
 * login lockout). The current password is still required to confirm.
 * Body: { password }
 */
export async function DELETE(request: NextRequest) {
  const start = Date.now();
  logger.info('API', 'DELETE /api/auth/delete');
  try {
    // requireSession also blocks cross-site requests (CSRF).
    const auth = await requireSession();
    if ('response' in auth) return auth.response;
    const userId = auth.session.userId;

    const body = await request.json().catch(() => ({}));
    if (!body?.password || typeof body.password !== 'string') {
      logger.warn('API', 'DELETE /api/auth/delete - missing password confirmation');
      logger.api('DELETE', '/api/auth/delete', 400, Date.now() - start);
      return NextResponse.json(
        { success: false, error: 'Password is required to delete account' },
        { status: 400 }
      );
    }

    // Same per-account cap as login, so a stolen session can't be used to
    // brute-force the password here.
    const rules: RateRule[] = [{ key: `delete:acct:${userId}`, limit: 6, windowSec: 900 }];
    const limited = await peekLimit(rules);
    if (limited) {
      logger.api('DELETE', '/api/auth/delete', 429, Date.now() - start);
      return limited;
    }

    const user = await getUserById(userId);
    if (!user || !user.passwordHash || !(await verifyPassword(body.password, user.passwordHash))) {
      await recordFailedAttempt(rules);
      logger.warn('API', 'DELETE /api/auth/delete - wrong password', { userId });
      logger.api('DELETE', '/api/auth/delete', 401, Date.now() - start);
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const deleted = await deleteUser(userId);

    if (!deleted) {
      logger.warn('API', 'DELETE /api/auth/delete - deletion failed', { userId });
      logger.api('DELETE', '/api/auth/delete', 400, Date.now() - start);
      return NextResponse.json(
        { success: false, error: 'Failed to delete user or user not found' },
        { status: 400 }
      );
    }

    logger.info('Auth', 'User account deleted', { userId });
    logger.api('DELETE', '/api/auth/delete', 200, Date.now() - start);

    const response = NextResponse.json(
      {
        success: true,
        message: 'User account deleted successfully',
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
    response.cookies.set(SESSION_COOKIE_NAME, '', { path: '/', maxAge: 0 });
    return response;
  } catch (error) {
    logger.error('API', 'DELETE /api/auth/delete - unhandled error', { error: error instanceof Error ? error.message : String(error) });
    logger.api('DELETE', '/api/auth/delete', 500, Date.now() - start);
    return NextResponse.json(
      { success: false, error: 'Something went wrong on our end. Please try again in a few moments.' },
      { status: 500 }
    );
  }
}
