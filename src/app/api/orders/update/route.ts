import { NextRequest, NextResponse } from 'next/server';
import { updateOrderStatus } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { OrderStatus } from '@/types';
import { logger } from '@/lib/logger';

/**
 * POST /api/orders/update
 *
 * Update an order's status with PIN authentication.
 * Status transitions are validated against VALID_STATUS_TRANSITIONS.
 */
export async function POST(request: NextRequest) {
  const start = Date.now();
  const auth = await requireRole('admin');
  if ('response' in auth) return auth.response;
  logger.info('API', 'POST /api/orders/update');
  try {
    const body = await request.json();
    const { orderId, status, pin, eta } = body;

    // Validate required fields
    if (!orderId || !status || !pin) {
      logger.warn('API', 'POST /api/orders/update — missing required fields');
      logger.api('POST', '/api/orders/update', 400, Date.now() - start);
      return NextResponse.json(
        { error: 'Missing required fields: orderId, status, pin' },
        { status: 400 }
      );
    }

    // Validate PIN format (4 digits)
    if (typeof pin !== 'string' || !/^\d{4}$/.test(pin)) {
      logger.warn('API', 'POST /api/orders/update — invalid PIN format');
      logger.api('POST', '/api/orders/update', 400, Date.now() - start);
      return NextResponse.json(
        { error: 'Invalid PIN format (must be 4 digits)' },
        { status: 400 }
      );
    }

    // Call update function with PIN authentication
    const result = await updateOrderStatus(
      orderId,
      status as OrderStatus,
      pin,
      eta
    );

    // Handle authentication failure (wrong PIN)
    if (!result.success && result.error === 'Invalid PIN') {
      logger.warn('API', 'POST /api/orders/update — invalid PIN attempt');
      logger.api('POST', '/api/orders/update', 401, Date.now() - start);
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
    }

    // Handle order not found
    if (!result.success && result.error === 'Order not found') {
      logger.warn('API', 'POST /api/orders/update — order not found');
      logger.api('POST', '/api/orders/update', 404, Date.now() - start);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Handle invalid state transition
    if (!result.success && result.error?.startsWith('Cannot transition')) {
      logger.warn('API', 'POST /api/orders/update — invalid status transition', { error: result.error });
      logger.api('POST', '/api/orders/update', 400, Date.now() - start);
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Handle other errors
    if (!result.success) {
      logger.error('API', 'POST /api/orders/update — update failed', { error: result.error });
      logger.api('POST', '/api/orders/update', 400, Date.now() - start);
      return NextResponse.json(
        { error: result.error || 'Failed to update order status' },
        { status: 400 }
      );
    }

    logger.info('Orders', 'Order status updated', { orderId: result.orderId, newStatus: status });
    logger.api('POST', '/api/orders/update', 200, Date.now() - start);

    // Return updated data directly — avoids re-fetching from potentially stale replica
    return NextResponse.json(
      {
        success: true,
        order: {
          id: result.orderId,
          status: status,
          eta: eta || null,
          updatedAt: new Date().toISOString(),
        },
      },
      {
        status: 200,
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  } catch (error) {
    logger.error('API', 'POST /api/orders/update — unhandled error', { error: error instanceof Error ? error.message : String(error) });
    logger.api('POST', '/api/orders/update', 500, Date.now() - start);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
