import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, setResetPasswordToken } from '@/lib/users';
import { sendEmail, getAppUrl } from '@/lib/email';
import { passwordResetTemplate } from '@/lib/email-templates';
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

    const token = await setResetPasswordToken(user.id);
    if (!token) {
      logger.error('Auth', 'forgot-password — failed to generate token', { userId: user.id });
      logger.api('POST', '/api/auth/forgot-password', 200, Date.now() - start);
      return okResponse;
    }

    const resetUrl = `${getAppUrl()}/reset-password?token=${token}`;
    const tmpl = passwordResetTemplate(user.name, resetUrl);
    await sendEmail({ to: user.email, ...tmpl });

    logger.info('Auth', '[AUTH] Password Reset email sent', { userId: user.id });
    logger.api('POST', '/api/auth/forgot-password', 200, Date.now() - start);

    return okResponse;
  } catch (error) {
    logger.error('Auth', 'forgot-password — unhandled error', {
      error: error instanceof Error ? error.message : String(error),
    });
    logger.api('POST', '/api/auth/forgot-password', 500, Date.now() - start);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
