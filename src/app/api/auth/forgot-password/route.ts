import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, setResetPasswordOtp } from '@/lib/users';
import { sendEmail } from '@/lib/email';
import { passwordResetOtpTemplate } from '@/lib/email-templates';
import { getClientIp, limitOrResponse } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

/**
 * POST /api/auth/forgot-password
 *
 * Generates a password-reset token and sends the reset email.
 * Always returns 200 to prevent email enumeration.
 * Body: { email: string }
 */
export async function POST(request: NextRequest) {
  const start = Date.now();
  logger.info('Auth', 'POST /api/auth/forgot-password');
  try {
    const body = await request.json();

    if (!body.email || typeof body.email !== 'string') {
      logger.api('POST', '/api/auth/forgot-password', 400, Date.now() - start);
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 },
      );
    }

    const email = body.email.toLowerCase().trim();

    // Throttle reset requests per IP and per account (H3) — limits reset-email
    // spam and OTP regeneration churn.
    const limited = await limitOrResponse([
      { key: `forgot:ip:${getClientIp(request)}`, limit: 6, windowSec: 3600 },
      { key: `forgot:acct:${email}`, limit: 4, windowSec: 3600 },
    ]);
    if (limited) {
      logger.warn('Auth', 'forgot-password — rate limited', { email });
      logger.api('POST', '/api/auth/forgot-password', 429, Date.now() - start);
      return limited;
    }
    const user = await getUserByEmail(email);

    // Always respond with the same message to prevent enumeration
    const okResponse = NextResponse.json({
      success: true,
      message: 'If that email is registered, you will receive a password reset link shortly.',
    });

    if (!user || !user.passwordHash) {
      logger.info('Auth', 'forgot-password — user not found (silent)', { email });
      logger.api('POST', '/api/auth/forgot-password', 200, Date.now() - start);
      return okResponse;
    }

    const otp = await setResetPasswordOtp(user.id);
    if (!otp) {
      logger.error('Auth', 'forgot-password — failed to generate OTP', { userId: user.id });
      logger.api('POST', '/api/auth/forgot-password', 200, Date.now() - start);
      return okResponse;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`\n🔑 PASSWORD RESET OTP (dev): ${otp}\n`);
    }

    const tmpl = passwordResetOtpTemplate(user.name, otp);
    const sent = await sendEmail({ to: user.email, ...tmpl });

    if (!sent) {
      logger.error('Auth', 'forgot-password — email delivery failed (check EMAIL_PROVIDER / RESEND_API_KEY / domain verification)', { userId: user.id });
    }

    logger.info('Auth', '[AUTH] Password Reset email sent', { userId: user.id, delivered: sent });
    logger.api('POST', '/api/auth/forgot-password', 200, Date.now() - start);

    return okResponse;
  } catch (error) {
    logger.error('Auth', 'forgot-password — unhandled error', {
      error: error instanceof Error ? error.message : String(error),
    });
    logger.api('POST', '/api/auth/forgot-password', 500, Date.now() - start);
    return NextResponse.json({ success: false, error: 'Something went wrong on our end. Please try again in a few moments.' }, { status: 500 });
  }
}
