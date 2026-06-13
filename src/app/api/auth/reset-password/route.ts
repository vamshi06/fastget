import { NextRequest, NextResponse } from 'next/server';
import { getUserByResetToken, resetUserPasswordByToken } from '@/lib/users';
import { sendEmail } from '@/lib/email';
import { passwordChangedTemplate } from '@/lib/email-templates';
import { logger } from '@/lib/logger';

/**
 * POST /api/auth/reset-password
 *
 * Validates the token, updates the password, clears the token, and sends a
 * confirmation email.
 * Body: { token: string, password: string }
 */
export async function POST(request: NextRequest) {
  const start = Date.now();
  logger.info('Auth', 'POST /api/auth/reset-password');
  try {
    const body = await request.json();

    if (!body.token || typeof body.token !== 'string' || body.token.trim().length === 0) {
      logger.api('POST', '/api/auth/reset-password', 400, Date.now() - start);
      return NextResponse.json(
        { success: false, error: 'Reset token is required' },
        { status: 400 },
      );
    }

    if (!body.password || typeof body.password !== 'string' || body.password.length < 8) {
      logger.api('POST', '/api/auth/reset-password', 400, Date.now() - start);
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters' },
        { status: 400 },
      );
    }

    const token = body.token.trim();

    // Validate token before resetting (gives a better UX error message)
    const tokenUser = await getUserByResetToken(token);
    if (!tokenUser) {
      logger.warn('Auth', 'reset-password — invalid or expired token');
      logger.api('POST', '/api/auth/reset-password', 400, Date.now() - start);
      return NextResponse.json(
        { success: false, error: 'Reset link is invalid or has expired. Please request a new one.' },
        { status: 400 },
      );
    }

    const updated = await resetUserPasswordByToken(token, body.password);
    if (!updated) {
      logger.error('Auth', 'reset-password — update failed', { userId: tokenUser.id });
      logger.api('POST', '/api/auth/reset-password', 500, Date.now() - start);
      return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }

    // Send "password changed" confirmation email (fire-and-forget)
    const tmpl = passwordChangedTemplate(updated.name);
    sendEmail({ to: updated.email, ...tmpl }).catch(() => {});

    logger.info('Auth', '[AUTH] Password Reset', { userId: updated.id });
    logger.api('POST', '/api/auth/reset-password', 200, Date.now() - start);

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully. You can now log in.',
    });
  } catch (error) {
    logger.error('Auth', 'reset-password — unhandled error', {
      error: error instanceof Error ? error.message : String(error),
    });
    logger.api('POST', '/api/auth/reset-password', 500, Date.now() - start);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
