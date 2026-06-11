import { NextRequest, NextResponse } from 'next/server';
import { Order, OrderStatus } from '@/types';
import {
  generateUUID,
  generateToken,
  formatPhoneNumber,
  validateOrderForm,
} from '@/lib/utils';
import { createOrder } from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * POST /api/orders
 *
 * Create a new order with customer details and cart items.
 * Generates unique status and update tokens for order tracking/management.
 *
 * SECURITY: updateToken is NOT returned to the client — it is only for
 * agents who access orders through the agent dashboard directly.
 */
export async function POST(request: NextRequest) {
  const start = Date.now();
  logger.info('API', 'POST /api/orders — incoming order request');
  try {
    const body = await request.json();

    // Validate order form data
    const validationError = validateOrderForm(body);
    if (validationError) {
      logger.warn('API', 'POST /api/orders — validation failed', { reason: validationError });
      logger.api('POST', '/api/orders', 400, Date.now() - start);
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const { items, subtotal, convenienceFee, total } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      logger.warn('API', 'POST /api/orders — empty cart');
      logger.api('POST', '/api/orders', 400, Date.now() - start);
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    // Basic numeric validation to prevent garbage data in DB
    if (
      typeof subtotal !== 'number' ||
      typeof convenienceFee !== 'number' ||
      typeof total !== 'number' ||
      subtotal < 0 ||
      convenienceFee < 0 ||
      total < 0
    ) {
      logger.warn('API', 'POST /api/orders — invalid totals', { subtotal, convenienceFee, total });
      logger.api('POST', '/api/orders', 400, Date.now() - start);
      return NextResponse.json({ error: 'Invalid order totals' }, { status: 400 });
    }

    // Generate tokens and IDs
    const orderId = generateUUID();
    const statusToken = generateToken();
    const updateToken = generateToken();

    // Build order object
    const order: Order = {
      id: orderId,
      createdAt: new Date().toISOString(),
      customerName: body.customerName.trim(),
      customerPhone: formatPhoneNumber(body.customerPhone),
      siteAddress: body.siteAddress.trim(),
      landmark: body.landmark?.trim() || undefined,
      deliveryType: body.deliveryType,
      scheduledTime: body.scheduledTime || undefined,
      items: items.map(
        (item: { product: { id: string; name: string; price: number }; quantity: number }) => ({
          sku: item.product.id,
          name: item.product.name,
          quantity: item.quantity,
          price: item.product.price,
        })
      ),
      subtotal,
      convenienceFee,
      total,
      paymentMethod: 'cod',
      status: 'received' as OrderStatus,
      statusToken,
      updateToken,
      userId: typeof body.userId === 'string' ? body.userId : undefined,
    };

    // Save to Neon database
    const success = await createOrder(order);

    if (!success) {
      logger.error('API', 'POST /api/orders — DB write failed', { orderId });
      logger.api('POST', '/api/orders', 502, Date.now() - start);
      return NextResponse.json(
        { error: 'We could not place the order right now. Please try again.' },
        { status: 502 }
      );
    }

    logger.info('Orders', 'Order created', { orderId, itemCount: order.items.length, total: order.total, deliveryType: order.deliveryType });
    logger.api('POST', '/api/orders', 201, Date.now() - start);

    // SECURITY: Return only statusToken — updateToken is intentionally omitted
    // so the customer's browser never holds agent-level access.
    return NextResponse.json(
      {
        success: true,
        orderId: order.id,
        statusToken: order.statusToken,
        status: order.status,
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('API', 'POST /api/orders — unhandled error', { error: error instanceof Error ? error.message : String(error) });
    logger.api('POST', '/api/orders', 500, Date.now() - start);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
