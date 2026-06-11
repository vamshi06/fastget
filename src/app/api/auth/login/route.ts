import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, authenticateUserByPhone } from '@/lib/users';
import type { User } from '@/types';
import { logger } from '@/lib/logger';

/**
 * POST /api/auth/login
 *
 * Authenticate a user with email and password.
 * Accepts: email, password
 * Returns: user object with id, name, email, and role
 */
export async function POST(request: NextRequest) {
  const start = Date.now();
  logger.info('API', 'POST /api/auth/login');
  try {
    const body = await request.json();

    if (!body.password || typeof body.password !== 'string') {
      logger.warn('API', 'POST /api/auth/login — missing password');
      logger.api('POST', '/api/auth/login', 400, Date.now() - start);
      return NextResponse.json(
        { success: false, error: 'Password is required' },
        { status: 400 }
      );
    }

    let user: User | null = null;

    if (body.phone && typeof body.phone === 'string') {
      // Phone-based auth
      user = await authenticateUserByPhone(body.phone.trim(), body.password);
      if (!user) {
        logger.warn('API', 'POST /api/auth/login — phone auth failed', { phone: body.phone });
        logger.api('POST', '/api/auth/login', 401, Date.now() - start);
        return NextResponse.json(
          { success: false, error: 'Invalid phone number or password' },
          { status: 401 }
        );
      }
    } else if (body.email && typeof body.email === 'string') {
      // Email-based auth (legacy)
      const email = body.email.toLowerCase().trim();
      user = await authenticateUser(email, body.password);
      if (!user) {
        logger.warn('API', 'POST /api/auth/login — email auth failed', { email });
        logger.api('POST', '/api/auth/login', 401, Date.now() - start);
        return NextResponse.json(
          { success: false, error: 'Invalid email or password' },
          { status: 401 }
        );
      }
    } else {
      logger.warn('API', 'POST /api/auth/login — missing phone or email');
      logger.api('POST', '/api/auth/login', 400, Date.now() - start);
      return NextResponse.json(
        { success: false, error: 'Phone number or email is required' },
        { status: 400 }
      );
    }

    logger.info('Auth', 'User logged in', { userId: user.id });
    logger.api('POST', '/api/auth/login', 200, Date.now() - start);

    // Return user data without password hash
    return NextResponse.json(
      {
        success: true,
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        message: 'Login successful',
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error) {
    logger.error('API', 'POST /api/auth/login — unhandled error', { error: error instanceof Error ? error.message : String(error) });
    logger.api('POST', '/api/auth/login', 500, Date.now() - start);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
