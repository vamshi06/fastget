import { NextRequest, NextResponse } from 'next/server';
import { deleteUser, getUserById, verifyPassword } from '@/lib/users';
import { logger } from '@/lib/logger';

/**
 * DELETE /api/auth/delete
 *
 * Delete a user account and all associated data.
 * Requires userId AND current password to prove ownership.
 * Returns: success confirmation
 */
export async function DELETE(request: NextRequest) {
  const start = Date.now();
  logger.info('API', 'DELETE /api/auth/delete');
  try {
    const body = await request.json();

    if (!body.userId || typeof body.userId !== 'string') {
      logger.warn('API', 'DELETE /api/auth/delete — missing userId');
      logger.api('DELETE', '/api/auth/delete', 400, Date.now() - start);
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (!body.password || typeof body.password !== 'string') {
      logger.warn('API', 'DELETE /api/auth/delete — missing password confirmation');
      logger.api('DELETE', '/api/auth/delete', 400, Date.now() - start);
      return NextResponse.json(
        { success: false, error: 'Password is required to delete account' },
        { status: 400 }
      );
    }

    // Verify password ownership before allowing deletion
    const user = await getUserById(body.userId);
    if (!user || !user.passwordHash) {
      // Generic message to avoid leaking whether the userId exists
      logger.warn('API', 'DELETE /api/auth/delete — user not found or no password hash', { userId: body.userId });
      logger.api('DELETE', '/api/auth/delete', 401, Date.now() - start);
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const passwordValid = await verifyPassword(body.password, user.passwordHash);
    if (!passwordValid) {
      logger.warn('API', 'DELETE /api/auth/delete — wrong password', { userId: body.userId });
      logger.api('DELETE', '/api/auth/delete', 401, Date.now() - start);
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const deleted = await deleteUser(body.userId);

    if (!deleted) {
      logger.warn('API', 'DELETE /api/auth/delete — deletion failed', { userId: body.userId });
      logger.api('DELETE', '/api/auth/delete', 400, Date.now() - start);
      return NextResponse.json(
        { success: false, error: 'Failed to delete user or user not found' },
        { status: 400 }
      );
    }

    logger.info('Auth', 'User account deleted', { userId: body.userId });
    logger.api('DELETE', '/api/auth/delete', 200, Date.now() - start);

    return NextResponse.json(
      {
        success: true,
        message: 'User account deleted successfully',
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  } catch (error) {
    logger.error('API', 'DELETE /api/auth/delete — unhandled error', { error: error instanceof Error ? error.message : String(error) });
    logger.api('DELETE', '/api/auth/delete', 500, Date.now() - start);
    return NextResponse.json(
      { success: false, error: 'Something went wrong on our end. Please try again in a few moments.' },
      { status: 500 }
    );
  }
}
