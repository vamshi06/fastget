import { NextRequest, NextResponse } from 'next/server';
import { createUser, setVerificationOtp } from '@/lib/users';
import { sendEmail } from '@/lib/email';
import { otpVerificationEmailTemplate } from '@/lib/email-templates';
import { getClientIp, limitOrResponse } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { NAME_REGEX } from '@/lib/utils';
import {
  ValidationError,
  requireString,
  requireEmail,
  requirePassword,
  requirePhone10,
} from '@/lib/validation';

/**
 * POST /api/auth/signup
 *
 * Register a new user account.
 * Creates the user with email_verified = false, sends a verification email,
 * and returns a needsVerification flag so the UI can show "check your inbox".
 */
export async function POST(request: NextRequest) {
  const start = Date.now();
  logger.info('Auth', '[AUTH] Signup — POST /api/auth/signup');
  try {
    // Throttle account creation per IP (H3).
    const limited = await limitOrResponse([
      { key: `signup:ip:${getClientIp(request)}`, limit: 6, windowSec: 3600 },
    ]);
    if (limited) {
      logger.warn('Auth', 'signup — rate limited');
      logger.api('POST', '/api/auth/signup', 429, Date.now() - start);
      return limited;
    }

    const body = await request.json();

    const name = requireString(body.name, 'name', {
      max: 120,
      pattern: NAME_REGEX,
      patternMsg: 'Please enter a valid name (letters, spaces, apostrophes and hyphens only).',
    });
    const email = requireEmail(body.email);
    const password = requirePassword(body.password);
    const phone = requirePhone10(body.phone);

    // Create user with email_verified = false
    const user = await createUser(
      email,
      phone,
      'customer',
      password,
      name,
      false, // emailVerified = false — must verify before logging in
    );

    if (!user) {
      logger.warn('Auth', 'signup — user creation failed (email may exist)', { email });
      logger.api('POST', '/api/auth/signup', 400, Date.now() - start);
      return NextResponse.json(
        { success: false, error: 'An account with this email already exists.' },
        { status: 400 },
      );
    }

    // Generate OTP and send verification email
    const otp = await setVerificationOtp(user.id);
    if (otp) {
      const tmpl = otpVerificationEmailTemplate(user.name, otp);
      const sent = await sendEmail({ to: user.email, ...tmpl });
      if (!sent) {
        logger.error('Auth', 'signup — verification email delivery failed (check EMAIL_PROVIDER / RESEND_API_KEY / domain verification)', { userId: user.id });
      }
      logger.info('Auth', '[AUTH] Verification OTP Sent', { userId: user.id, delivered: sent });
    } else {
      logger.warn('Auth', 'signup — OTP generation failed', { userId: user.id });
    }

    logger.info('Auth', '[AUTH] Signup', { userId: user.id });
    logger.api('POST', '/api/auth/signup', 201, Date.now() - start);

    return NextResponse.json(
      {
        success: true,
        needsVerification: true,
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        message: 'Account created successfully. Please verify your email to continue.',
      },
      {
        status: 201,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      },
    );
  } catch (error) {
    if (error instanceof ValidationError) {
      logger.warn('Auth', 'signup — validation failed', { error: error.message });
      logger.api('POST', '/api/auth/signup', 400, Date.now() - start);
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    logger.error('Auth', 'signup — unhandled error', {
      error: error instanceof Error ? error.message : String(error),
    });
    logger.api('POST', '/api/auth/signup', 500, Date.now() - start);
    return NextResponse.json({ success: false, error: 'Something went wrong on our end. Please try again in a few moments.' }, { status: 500 });
  }
}
