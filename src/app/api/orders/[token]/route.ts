import { NextRequest, NextResponse } from 'next/server';
import { getOrderByStatusToken } from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * GET /api/orders/[token]
 *
 * Retrieve an order by its status token (customer-facing endpoint).
 * Does NOT return the agent updateToken.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  const start = Date.now();
  try {
    const { token } = await context.params;
    const normalizedToken = token?.toLowerCase();
    logger.info('API', `GET /api/orders/${normalizedToken}`);

    if (!normalizedToken) {
      logger.warn('API', 'GET /api/orders/[token] — missing token');
      logger.api('GET', '/api/orders/[token]', 400, Date.now() - start);
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const order = await getOrderByStatusToken(normalizedToken);

    if (!order) {
      logger.warn('API', 'GET /api/orders/[token] — order not found', { token: normalizedToken });
      logger.api('GET', '/api/orders/[token]', 404, Date.now() - start);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    logger.debug('API', 'GET /api/orders/[token] — order found', { orderId: order.id, status: order.status });
    logger.api('GET', '/api/orders/[token]', 200, Date.now() - start);

    // Return order without sensitive updateToken
    return NextResponse.json(
      {
        success: true,
        order: {
          id: order.id,
          createdAt: order.createdAt,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          siteAddress: order.siteAddress,
          landmark: order.landmark,
          deliveryType: order.deliveryType,
          scheduledTime: order.scheduledTime,
          items: order.items,
          subtotal: order.subtotal,
          convenienceFee: order.convenienceFee,
          total: order.total,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          status: order.status,
          eta: order.eta,
          statusToken: order.statusToken,
          // updateToken intentionally omitted
        },
      },
      
      {
        status: 200,
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  } catch (error) {
    logger.error('API', 'GET /api/orders/[token] — unhandled error', { error: error instanceof Error ? error.message : String(error) });
    logger.api('GET', '/api/orders/[token]', 500, Date.now() - start);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
