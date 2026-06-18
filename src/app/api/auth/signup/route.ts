import { NextRequest, NextResponse } from 'next/server';
import { createUser, setVerificationOtp } from '@/lib/users';
import { sendEmail } from '@/lib/email';
import { otpVerificationEmailTemplate } from '@/lib/email-templates';
import { getClientIp, limitOrResponse } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

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

    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      logger.warn('Auth', 'signup — missing name');
      logger.api('POST', '/api/auth/signup', 400, Date.now() - start);
      return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
    }

    if (!body.email || typeof body.email !== 'string') {
      logger.warn('Auth', 'signup — missing email');
      logger.api('POST', '/api/auth/signup', 400, Date.now() - start);
      return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email.trim())) {
      logger.warn('Auth', 'signup — invalid email format');
      logger.api('POST', '/api/auth/signup', 400, Date.now() - start);
      return NextResponse.json(
        { success: false, error: 'Please enter a valid email address' },
        { status: 400 },
      );
    }

    if (!body.password || typeof body.password !== 'string' || body.password.length < 8) {
      logger.warn('Auth', 'signup — weak password');
      logger.api('POST', '/api/auth/signup', 400, Date.now() - start);
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters' },
        { status: 400 },
      );
    }

    if (!body.phone || typeof body.phone !== 'string') {
      logger.warn('Auth', 'signup — missing phone');
      logger.api('POST', '/api/auth/signup', 400, Date.now() - start);
      return NextResponse.json({ success: false, error: 'Phone number is required' }, { status: 400 });
    }

    const email = body.email.toLowerCase().trim();

    // Create user with email_verified = false
    const user = await createUser(
      email,
      body.phone.trim(),
      'customer',
      body.password,
      body.name.trim(),
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
    logger.error('Auth', 'signup — unhandled error', {
      error: error instanceof Error ? error.message : String(error),
    });
    logger.api('POST', '/api/auth/signup', 500, Date.now() - start);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
