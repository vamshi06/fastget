import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, setVerificationOtp, canResendVerification } from '@/lib/users';
import { sendEmail } from '@/lib/email';
import { resendOtpEmailTemplate } from '@/lib/email-templates';
import { logger } from '@/lib/logger';

/**
 * POST /api/auth/resend-verification
 *
 * Generates a new verification token and re-sends the email.
 * Rate-limited to 1 request per 60 seconds per user.
 * Body: { email: string }
 */
export async function POST(request: NextRequest) {
  const start = Date.now();
  logger.info('Auth', 'POST /api/auth/resend-verification');
  try {
    const body = await request.json();

    if (!body.email || typeof body.email !== 'string') {
      logger.api('POST', '/api/auth/resend-verification', 400, Date.now() - start);
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 },
      );
    }

    const email = body.email.toLowerCase().trim();
    const user = await getUserByEmail(email);

    // Always return success to prevent email enumeration
    if (!user) {
      logger.api('POST', '/api/auth/resend-verification', 200, Date.now() - start);
      return NextResponse.json({
        success: true,
        message: 'If that email exists and is unverified, a new link has been sent.',
      });
    }

    if (user.emailVerified) {
      logger.info('Auth', 'resend-verification — already verified', { userId: user.id });
      logger.api('POST', '/api/auth/resend-verification', 200, Date.now() - start);
      return NextResponse.json({
        success: true,
        message: 'If that email exists and is unverified, a new link has been sent.',
      });
    }

    const canResend = await canResendVerification(user.id);
    if (!canResend) {
      logger.warn('Auth', 'resend-verification — rate limited', { userId: user.id });
      logger.api('POST', '/api/auth/resend-verification', 429, Date.now() - start);
      return NextResponse.json(
        { success: false, error: 'Please wait a minute before requesting another verification email.' },
        { status: 429 },
      );
    }

    const otp = await setVerificationOtp(user.id);
    if (!otp) {
      logger.error('Auth', 'resend-verification — failed to generate OTP', { userId: user.id });
      logger.api('POST', '/api/auth/resend-verification', 500, Date.now() - start);
      return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }

    const tmpl = resendOtpEmailTemplate(user.name, otp);
    await sendEmail({ to: user.email, ...tmpl });

    logger.info('Auth', '[AUTH] Verification Sent (resend)', { userId: user.id });
    logger.api('POST', '/api/auth/resend-verification', 200, Date.now() - start);

    return NextResponse.json({
      success: true,
      message: 'If that email exists and is unverified, a new link has been sent.',
    });
  } catch (error) {
    logger.error('Auth', 'resend-verification — unhandled error', {
      error: error instanceof Error ? error.message : String(error),
    });
    logger.api('POST', '/api/auth/resend-verification', 500, Date.now() - start);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
