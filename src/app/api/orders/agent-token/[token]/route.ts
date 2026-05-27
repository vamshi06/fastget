import { NextRequest, NextResponse } from 'next/server';
import { getOrderByUpdateToken } from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * GET /api/orders/agent-token/[token]
 *
 * Retrieve an order by its update token (agent access).
 * Does NOT return the statusToken for security.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  const start = Date.now();
  try {
    const { token } = await context.params;
    const normalizedToken = token?.toLowerCase();

    logger.info('API', 'GET /api/orders/agent-token/[token]');

    if (!normalizedToken) {
      logger.warn('API', 'GET /api/orders/agent-token/[token] — missing token');
      logger.api('GET', '/api/orders/agent-token/[token]', 400, Date.now() - start);
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const order = await getOrderByUpdateToken(normalizedToken);

    if (!order) {
      logger.warn('API', 'GET /api/orders/agent-token/[token] — order not found');
      logger.api('GET', '/api/orders/agent-token/[token]', 404, Date.now() - start);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    logger.debug('API', 'GET /api/orders/agent-token/[token] — order found', { orderId: order.id });
    logger.api('GET', '/api/orders/agent-token/[token]', 200, Date.now() - start);

    // Return order without statusToken for security
    const { statusToken, ...orderWithoutStatusToken } = order;

    return NextResponse.json(orderWithoutStatusToken, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    logger.error('API', 'GET /api/orders/agent-token/[token] — unhandled error', { error: error instanceof Error ? error.message : String(error) });
    logger.api('GET', '/api/orders/agent-token/[token]', 500, Date.now() - start);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
