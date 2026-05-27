import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/users';
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

    // Validation
    if (!body.email || typeof body.email !== 'string') {
      logger.warn('API', 'POST /api/auth/login — missing email');
      logger.api('POST', '/api/auth/login', 400, Date.now() - start);
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    if (!body.password || typeof body.password !== 'string') {
      logger.warn('API', 'POST /api/auth/login — missing password');
      logger.api('POST', '/api/auth/login', 400, Date.now() - start);
      return NextResponse.json(
        { success: false, error: 'Password is required' },
        { status: 400 }
      );
    }

    // Normalize email
    const email = body.email.toLowerCase().trim();

    // Authenticate user
    const user = await authenticateUser(email, body.password);

    if (!user) {
      logger.warn('API', 'POST /api/auth/login — authentication failed', { email });
      logger.api('POST', '/api/auth/login', 401, Date.now() - start);
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
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
