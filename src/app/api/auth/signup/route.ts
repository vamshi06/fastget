import { NextRequest, NextResponse } from 'next/server';
import { createUser } from '@/lib/users';
import { logger } from '@/lib/logger';

/**
 * POST /api/auth/signup
 *
 * Register a new user account.
 * Accepts: name, email, password, phone
 * Returns: user object with id, name, and email
 */
export async function POST(request: NextRequest) {
  const start = Date.now();
  logger.info('API', 'POST /api/auth/signup');
  try {
    const body = await request.json();

    // Validation
    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      logger.warn('API', 'POST /api/auth/signup — missing name');
      logger.api('POST', '/api/auth/signup', 400, Date.now() - start);
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      );
    }

    if (!body.email || typeof body.email !== 'string') {
      logger.warn('API', 'POST /api/auth/signup — missing email');
      logger.api('POST', '/api/auth/signup', 400, Date.now() - start);
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    if (!body.password || typeof body.password !== 'string' || body.password.length < 6) {
      logger.warn('API', 'POST /api/auth/signup — invalid password');
      logger.api('POST', '/api/auth/signup', 400, Date.now() - start);
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    if (!body.phone || typeof body.phone !== 'string') {
      logger.warn('API', 'POST /api/auth/signup — missing phone');
      logger.api('POST', '/api/auth/signup', 400, Date.now() - start);
      return NextResponse.json(
        { success: false, error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Normalize email
    const email = body.email.toLowerCase().trim();

    // Create user with password hashing
    const user = await createUser(
      email,
      body.phone.trim(),
      'customer', // Default role
      body.password, // Will be hashed internally
      body.name.trim() // Pass name
    );

    if (!user) {
      logger.warn('API', 'POST /api/auth/signup — user creation failed (email may exist)', { email });
      logger.api('POST', '/api/auth/signup', 400, Date.now() - start);
      return NextResponse.json(
        { success: false, error: 'Failed to create user (email may already exist)' },
        { status: 400 }
      );
    }

    logger.info('Auth', 'User registered', { userId: user.id });
    logger.api('POST', '/api/auth/signup', 201, Date.now() - start);

    // Don't return password hash to client
    return NextResponse.json(
      {
        success: true,
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        message: 'User registered successfully',
      },
      {
        status: 201,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error) {
    logger.error('API', 'POST /api/auth/signup — unhandled error', { error: error instanceof Error ? error.message : String(error) });
    logger.api('POST', '/api/auth/signup', 500, Date.now() - start);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
