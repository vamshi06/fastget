import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { getUserByEmail, getUserByPhone } from '@/lib/users';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /admin/api/coins/lookup?query=<email or phone>
 *
 * Admin-only: resolves a customer's email or phone to their user id, so the
 * coins admin page can look someone up before viewing/adjusting their balance.
 */
export async function GET(request: NextRequest) {
  const auth = await requireRole('admin');
  if ('response' in auth) return auth.response;
  const start = Date.now();

  try {
    const query = request.nextUrl.searchParams.get('query')?.trim() ?? '';
    if (!query) {
      logger.api('GET', '/admin/api/coins/lookup', 400, Date.now() - start);
      return NextResponse.json({ success: false, error: 'query is required' }, { status: 400 });
    }

    const user = query.includes('@') ? await getUserByEmail(query) : await getUserByPhone(query);
    if (!user) {
      logger.api('GET', '/admin/api/coins/lookup', 404, Date.now() - start);
      return NextResponse.json({ success: false, error: 'No user found' }, { status: 404 });
    }

    logger.api('GET', '/admin/api/coins/lookup', 200, Date.now() - start);
    return NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone },
    });
  } catch (error) {
    logger.error('API', 'GET /admin/api/coins/lookup — unhandled error', {
      error: error instanceof Error ? error.message : String(error),
    });
    logger.api('GET', '/admin/api/coins/lookup', 500, Date.now() - start);
    return NextResponse.json({ success: false, error: 'Something went wrong on our end. Please try again in a few moments.' }, { status: 500 });
  }
}
