import { NextRequest, NextResponse } from 'next/server';
import { getOrdersByUserId } from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * GET /api/orders/my-orders?userId=<id>
 *
 * Returns all orders placed by the authenticated user.
 */
export async function GET(request: NextRequest) {
  const start = Date.now();
  const userId = request.nextUrl.searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  try {
    const orders = await getOrdersByUserId(userId);
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
