import { NextRequest, NextResponse } from 'next/server';
import { verifyUserEmailByOtp } from '@/lib/users';
import { logger } from '@/lib/logger';

/**
 * POST /api/auth/verify-email
 *
 * Validates a 6-digit OTP against the user's email, marks the account verified.
 * Body: { email: string; otp: string }
 */
export async function POST(request: NextRequest) {
  const start = Date.now();
  logger.info('Auth', 'POST /api/auth/verify-email');
  try {
    const body = await request.json();

    if (!body.email || typeof body.email !== 'string') {
      logger.api('POST', '/api/auth/verify-email', 400, Date.now() - start);
      return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 });
    }

    if (!body.otp || typeof body.otp !== 'string' || !/^\d{6}$/.test(body.otp.trim())) {
      logger.api('POST', '/api/auth/verify-email', 400, Date.now() - start);
      return NextResponse.json({ success: false, error: 'Enter the 6-digit code from your email' }, { status: 400 });
    }

    const user = await verifyUserEmailByOtp(body.email.trim(), body.otp.trim());

    if (!user) {
      logger.warn('Auth', 'verify-email — invalid or expired OTP');
      logger.api('POST', '/api/auth/verify-email', 400, Date.now() - start);
      return NextResponse.json(
        { success: false, error: 'Incorrect code or code has expired. Request a new one.' },
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
