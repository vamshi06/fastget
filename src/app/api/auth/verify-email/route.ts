import { NextRequest, NextResponse } from 'next/server';
import { verifyUserEmail } from '@/lib/users';
import { logger } from '@/lib/logger';

/**
 * POST /api/auth/verify-email
 *
 * Validates the token, marks the user's email as verified, and clears the token.
 * Body: { token: string }
 */
export async function POST(request: NextRequest) {
  const start = Date.now();
  logger.info('Auth', 'POST /api/auth/verify-email');
  try {
    const body = await request.json();

    if (!body.token || typeof body.token !== 'string' || body.token.trim().length === 0) {
      logger.warn('Auth', 'verify-email — missing token');
      logger.api('POST', '/api/auth/verify-email', 400, Date.now() - start);
      return NextResponse.json(
        { success: false, error: 'Verification token is required' },
        { status: 400 },
      );
    }

    const user = await verifyUserEmail(body.token.trim());

    if (!user) {
      logger.warn('Auth', 'verify-email — invalid or expired token');
      logger.api('POST', '/api/auth/verify-email', 400, Date.now() - start);
      return NextResponse.json(
        { success: false, error: 'Verification link is invalid or has expired.' },
        { status: 400 },
      );
    }

    logger.info('Auth', '[AUTH] Verification Success', { userId: user.id });
    logger.api('POST', '/api/auth/verify-email', 200, Date.now() - start);

    return NextResponse.json({ success: true, message: 'Email verified successfully.' });
  } catch (error) {
    logger.error('Auth', 'verify-email — unhandled error', {
      error: error instanceof Error ? error.message : String(error),
    });
    logger.api('POST', '/api/auth/verify-email', 500, Date.now() - start);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
