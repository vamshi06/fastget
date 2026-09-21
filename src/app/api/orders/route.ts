import { NextRequest, NextResponse } from 'next/server';
import { Order, OrderStatus } from '@/types';
import {
  generateUUID,
  generateToken,
  formatPhoneNumber,
  validateOrderForm,
} from '@/lib/utils';
import { createOrder, debitCoins } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { priceOrderFromCatalog } from '@/lib/order-pricing';
import { notifyStaffOfNewOrder } from '@/lib/order-notifications';
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

    const { items, total, coinsToRedeem } = body;

    // Attribute the order to the logged-in user via the verified session cookie
    // (never the request body — IDOR fix, consistent with C3). Guests get an
    // unattributed order (user_id NULL) and can't redeem coins.
    const session = await getSession();

    // Recompute line items and totals from the trusted catalog (H1). Client
    // item prices / subtotal / convenienceFee / total are never trusted; the
    // client total is only used to detect (and reject) a tampered/stale cart.
    const pricing = await priceOrderFromCatalog(
      items,
      typeof total === 'number' ? total : undefined,
      session?.userId,
      typeof coinsToRedeem === 'number' ? coinsToRedeem : undefined,
    );
    if (!pricing.ok) {
      logger.warn('API', 'POST /api/orders — pricing rejected', { reason: pricing.error });
      logger.api('POST', '/api/orders', pricing.status, Date.now() - start);
      return NextResponse.json({ error: pricing.error }, { status: pricing.status });
    }
    const { items: pricedItems, subtotal, convenienceFee, discount, total: serverTotal, coinsRedeemed } = pricing.priced;

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
      items: pricedItems,
      subtotal,
      convenienceFee,
      discount,
      total: serverTotal,
      paymentMethod: 'cod',
      status: 'received' as OrderStatus,
      statusToken,
      updateToken,
      userId: session?.userId,
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

    // Debit redeemed coins now that the order is confirmed saved. Best-effort:
    // the order itself is already placed at the discounted total, so a debit
    // failure here is a reconciliation issue to log, not a reason to fail the order.
    if (session?.userId && coinsRedeemed > 0) {
      const debited = await debitCoins(session.userId, coinsRedeemed, orderId);
      if (!debited) {
        logger.error('API', 'POST /api/orders — coin debit failed after order creation', { orderId, userId: session.userId, coinsRedeemed });
      }
    }

    // Best-effort staff alert (Telegram + email) — never blocks/fails the order response.
    await notifyStaffOfNewOrder(order);

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
    return NextResponse.json({ error: 'Something went wrong on our end. Please try again in a few moments.' }, { status: 500 });
  }
}
