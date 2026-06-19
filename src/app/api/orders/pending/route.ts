import { NextRequest, NextResponse } from 'next/server';
import { getUnpooledConnection } from '@/lib/db';
import { logger } from '@/lib/logger';

// Force dynamic rendering to allow search params
export const dynamic = 'force-dynamic';

/**
 * GET /api/orders/pending
 *
 * Return list of orders filtered by status (default: 'received').
 * Used for agent dashboard to see which orders need attention.
 *
 * Query params:
 * - status (optional): Filter by status (default: 'received')
 * - limit (optional): Number of results (default: 20, max: 100)
 */
export async function GET(request: NextRequest) {
  const start = Date.now();
  try {
    const searchParams = request.nextUrl.searchParams;
    const statusFilter = searchParams.get('status') || 'received';
    const limitParam = parseInt(searchParams.get('limit') || '20', 10);
    const limit = isNaN(limitParam) || limitParam < 1 ? 20 : Math.min(limitParam, 100);

    logger.info('API', 'GET /api/orders/pending', { statusFilter, limit });

    // Validate status is one of allowed values
    const validStatuses = ['received', 'eta_assigned', 'out_for_delivery', 'delivered', 'cancelled'];
    if (!validStatuses.includes(statusFilter)) {
      logger.warn('API', 'GET /api/orders/pending — invalid status filter', { statusFilter });
      logger.api('GET', '/api/orders/pending', 400, Date.now() - start);
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // Use unpooled connection to read fresh data from primary
    const sqlConn = getUnpooledConnection();

    // Get total count for the status
    const countResult = await sqlConn`
      SELECT COUNT(*)::integer AS total
      FROM orders
      WHERE status = ${statusFilter}
    `;
    // Neon returns COUNT as bigint string — cast to number safely
    const totalCount = Number(countResult[0]?.total ?? 0);

    // Fetch orders with the specified status
    const orders = await sqlConn`
      SELECT
        id,
        created_at,
        customer_name,
        customer_phone,
        site_address,
        landmark,
        delivery_type,
        scheduled_time,
        items,
        subtotal,
        convenience_fee,
        total,
        payment_method,
        status,
        eta
      FROM orders
      WHERE status = ${statusFilter}
      ORDER BY created_at ASC
      LIMIT ${limit}
    `;

    const formattedOrders = orders.map((order: any) => ({
      id: order.id,
      createdAt: order.created_at,
      customerName: order.customer_name,
      customerPhone: order.customer_phone,
      siteAddress: order.site_address,
      landmark: order.landmark,
      deliveryType: order.delivery_type,
      scheduledTime: order.scheduled_time,
      items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items,
      subtotal: order.subtotal,
      convenienceFee: order.convenience_fee,
      total: order.total,
      paymentMethod: order.payment_method,
      status: order.status,
      eta: order.eta,
    }));

    logger.debug('API', 'GET /api/orders/pending — orders fetched', { statusFilter, count: formattedOrders.length, total: totalCount });
    logger.api('GET', '/api/orders/pending', 200, Date.now() - start);

    return NextResponse.json(
      {
        success: true,
        count: totalCount,
        status: statusFilter,
        orders: formattedOrders,
      },
      {
        status: 200,
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  } catch (error) {
    logger.error('API', 'GET /api/orders/pending — unhandled error', { error: error instanceof Error ? error.message : String(error) });
    logger.api('GET', '/api/orders/pending', 500, Date.now() - start);
    return NextResponse.json({ error: 'Something went wrong on our end. Please try again in a few moments.' }, { status: 500 });
  }
}
