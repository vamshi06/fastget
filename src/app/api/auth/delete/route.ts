import { NextRequest, NextResponse } from 'next/server';
import { deleteUser } from '@/lib/users';

/**
 * DELETE /api/auth/delete
 *
 * Delete a user account and all associated data.
 * Accepts: userId (required)
 * Returns: success confirmation
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.userId || typeof body.userId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Delete user from database
    const deleted = await deleteUser(body.userId);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete user or user not found' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'User account deleted successfully',
      },
      {
        status: 200,
        headers: {
          // Prevent caching of deletion response
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('Error during user deletion:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
