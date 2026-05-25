import { NextRequest, NextResponse } from 'next/server';
import { createUser, hashPassword } from '@/lib/users';

/**
 * POST /api/auth/signup
 *
 * Register a new user account.
 * Accepts: name, email, password, phone
 * Returns: user object with id, name, and email
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validation
    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      );
    }

    if (!body.email || typeof body.email !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    if (!body.password || typeof body.password !== 'string' || body.password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    if (!body.phone || typeof body.phone !== 'string') {
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
      return NextResponse.json(
        { success: false, error: 'Failed to create user (email may already exist)' },
        { status: 400 }
      );
    }

    // Don't return password hash to client
    return NextResponse.json(
      {
        success: true,
        id: user.id,
        name: user.name,
        email: user.email,
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
    console.error('Error during signup:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
