import { NextRequest, NextResponse } from 'next/server';
import { verifyResetOtp } from '@/lib/users';
import { logger } from '@/lib/logger';

/**
 * POST /api/auth/verify-reset-otp
 *
 * Validates the 6-digit reset OTP and exchanges it for a reset token.
 * Body: { email: string; otp: string }
 * Returns: { success: true; token: string } on success
 */
export async function POST(request: NextRequest) {
  const start = Date.now();
  logger.info('Auth', 'POST /api/auth/verify-reset-otp');
  try {
    const body = await request.json();

    if (!body.email || typeof body.email !== 'string') {
      logger.api('POST', '/api/auth/verify-reset-otp', 400, Date.now() - start);
      return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 });
    }

    if (!body.otp || typeof body.otp !== 'string' || !/^\d{6}$/.test(body.otp.trim())) {
      logger.api('POST', '/api/auth/verify-reset-otp', 400, Date.now() - start);
      return NextResponse.json(
        { success: false, error: 'Enter the 6-digit code from your email' },
        { status: 400 },
      );
    }

    const token = await verifyResetOtp(body.email.trim(), body.otp.trim());

    if (!token) {
      logger.warn('Auth', 'verify-reset-otp — invalid or expired OTP');
      logger.api('POST', '/api/auth/verify-reset-otp', 400, Date.now() - start);
      return NextResponse.json(
        { success: false, error: 'Incorrect code or code has expired. Request a new one.' },
        { status: 400 },
      );
    }

    logger.info('Auth', '[AUTH] Reset OTP verified');
    logger.api('POST', '/api/auth/verify-reset-otp', 200, Date.now() - start);

    return NextResponse.json({ success: true, token });
  } catch (error) {
    logger.error('Auth', 'verify-reset-otp — unhandled error', {
      error: error instanceof Error ? error.message : String(error),
    });
    logger.api('POST', '/api/auth/verify-reset-otp', 500, Date.now() - start);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
