import { NextRequest, NextResponse } from 'next/server';
import { getOrdersByUserId } from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { logger } from '@/lib/logger';

/**
 * GET /api/orders/my-orders
 *
 * Returns all orders placed by the authenticated user. The user id comes from
 * the verified session cookie — never from the request — so one user cannot
 * read another user's orders (IDOR fix, C3).
 */
export async function GET(_request: NextRequest) {
  const start = Date.now();
  const auth = await requireSession();
  if ('response' in auth) return auth.response;

  try {
    const orders = await getOrdersByUserId(auth.session.userId);
    logger.api('GET', '/api/orders/my-orders', 200, Date.now() - start);
    return NextResponse.json({ orders }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    logger.error('API', 'GET /api/orders/my-orders — unhandled error', {
      error: error instanceof Error ? error.message : String(error),
    });
    logger.api('GET', '/api/orders/my-orders', 500, Date.now() - start);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
