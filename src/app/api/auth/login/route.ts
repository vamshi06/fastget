import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, authenticateUserByPhone } from '@/lib/users';
import { createSessionToken, SESSION_COOKIE_NAME, sessionCookieOptions } from '@/lib/session';
import { getClientIp, limitOrResponse } from '@/lib/rate-limit';
import type { User } from '@/types';
import { logger } from '@/lib/logger';

/**
 * POST /api/auth/login
 *
 * Authenticate with email+password or phone+password.
 * Blocks login if email_verified is explicitly false (new accounts must verify).
 * Existing users (email_verified = true by migration default) are unaffected.
 */
export async function POST(request: NextRequest) {
  const start = Date.now();
  logger.info('Auth', '[AUTH] Login — POST /api/auth/login');
  try {
    const body = await request.json();

    if (!body.password || typeof body.password !== 'string') {
      logger.warn('Auth', 'login — missing password');
      logger.api('POST', '/api/auth/login', 400, Date.now() - start);
      return NextResponse.json(
        { success: false, error: 'Password is required' },
        { status: 400 },
      );
    }

    // Brute-force protection (H3): cap attempts per IP and per account.
    const ip = getClientIp(request);
    const acct =
      typeof body.phone === 'string'
        ? `phone:${body.phone.replace(/\D/g, '').slice(-10)}`
        : typeof body.email === 'string'
          ? `email:${body.email.toLowerCase().trim()}`
          : null;
    const limited = await limitOrResponse([
      { key: `login:ip:${ip}`, limit: 20, windowSec: 600 },
      ...(acct ? [{ key: `login:acct:${acct}`, limit: 6, windowSec: 900 }] : []),
    ]);
    if (limited) {
      logger.warn('Auth', 'login — rate limited', { ip });
      logger.api('POST', '/api/auth/login', 429, Date.now() - start);
      return limited;
    }

    let user: User | null = null;

    if (body.phone && typeof body.phone === 'string') {
      user = await authenticateUserByPhone(body.phone.trim(), body.password);
      if (!user) {
        logger.warn('Auth', 'login — phone auth failed', { phone: body.phone });
        logger.api('POST', '/api/auth/login', 401, Date.now() - start);
        return NextResponse.json(
          { success: false, error: 'Invalid phone number or password' },
          { status: 401 },
        );
      }
    } else if (body.email && typeof body.email === 'string') {
      const email = body.email.toLowerCase().trim();
      user = await authenticateUser(email, body.password);
      if (!user) {
        logger.warn('Auth', 'login — email auth failed', { email });
        logger.api('POST', '/api/auth/login', 401, Date.now() - start);
        return NextResponse.json(
          { success: false, error: 'Invalid email or password' },
          { status: 401 },
        );
      }
    } else {
      logger.warn('Auth', 'login — missing phone or email');
      logger.api('POST', '/api/auth/login', 400, Date.now() - start);
      return NextResponse.json(
        { success: false, error: 'Phone number or email is required' },
        { status: 400 },
      );
    }

    // Block login for accounts that have explicitly NOT verified their email.
    // emailVerified defaults to true (via migration) for all pre-existing users,
    // so only newly-registered accounts that haven't clicked the link are blocked.
    if (user.emailVerified === false) {
      logger.warn('Auth', 'login — email not verified', { userId: user.id });
      logger.api('POST', '/api/auth/login', 403, Date.now() - start);
      return NextResponse.json(
        {
          success: false,
          requiresVerification: true,
          email: user.email,
          error: 'Please verify your email before logging in.',
        },
        { status: 403 },
      );
    }

    logger.info('Auth', '[AUTH] Login', { userId: user.id, role: user.role });
    logger.api('POST', '/api/auth/login', 200, Date.now() - start);

    const sessionToken = await createSessionToken({ userId: user.id, role: user.role });

    const response = NextResponse.json(
      {
        success: true,
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        message: 'Login successful',
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      },
    );

    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, sessionCookieOptions(user.role));
    return response;
  } catch (error) {
    logger.error('Auth', 'login — unhandled error', {
      error: error instanceof Error ? error.message : String(error),
    });
    logger.api('POST', '/api/auth/login', 500, Date.now() - start);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
