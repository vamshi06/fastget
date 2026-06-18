import { NextRequest, NextResponse } from 'next/server';
import { createRazorpayOrder } from '@/lib/razorpay';
import { createOrder } from '@/lib/db';
import { setRazorpayOrderId } from '@/lib/payment-db';
import { generateUUID, generateToken, formatPhoneNumber, validateOrderForm } from '@/lib/utils';
import { getSession } from '@/lib/auth';
import { priceOrderFromCatalog } from '@/lib/order-pricing';
import { Order } from '@/types';
import { logger } from '@/lib/logger';

/**
 * POST /api/payment/create-order
 *
 * Creates a DB order (payment_method='razorpay') then a corresponding Razorpay
 * order.  Returns the Razorpay order ID so the frontend can open the checkout
 * modal.  The DB order is created first so its total is the authoritative amount
 * — any frontend tampering after this point has no effect on what is charged.
 *
 * Prices and totals are recomputed server-side from the trusted catalog (H1);
 * client-supplied item prices / subtotal / total are never trusted.
 *
 * Body: { ...orderFormData, items, total?, currency? }
 *
 * Response: { razorpayOrderId, amount (paise), currency, orderId, statusToken }
 */
export async function POST(request: NextRequest) {
  const start = Date.now();
  logger.info('Payment', 'POST /api/payment/create-order');

  try {
    const body = await request.json();
    // userId is intentionally NOT read from the body — identity comes from the
    // verified session cookie only (IDOR fix, consistent with C3). A stray
    // userId in the body is ignored. Prices/totals are recomputed server-side,
    // so client-supplied subtotal/convenienceFee/total are ignored too (H1).
    const { currency = 'INR', items, total, ...formFields } = body;

    // Re-use the same form validation as the COD orders flow
    const validationError = validateOrderForm(formFields);
    if (validationError) {
      logger.warn('Payment', 'create-order — validation failed', { reason: validationError });
      logger.api('POST', '/api/payment/create-order', 400, Date.now() - start);
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    // Recompute line items and totals from the trusted catalog (H1). The client
    // total is only used to detect a tampered/stale cart and reject it.
    const pricing = await priceOrderFromCatalog(items, typeof total === 'number' ? total : undefined);
    if (!pricing.ok) {
      logger.warn('Payment', 'create-order — pricing rejected', { reason: pricing.error });
      logger.api('POST', '/api/payment/create-order', pricing.status, Date.now() - start);
      return NextResponse.json({ error: pricing.error }, { status: pricing.status });
    }
    const { items: pricedItems, subtotal, convenienceFee, total: serverTotal } = pricing.priced;

    // Attribute the order to the logged-in user via the verified session cookie.
    // Guests (no session) get an unattributed order (user_id NULL).
    const session = await getSession();

    // Create the DB order first — this locks in the amount before Razorpay sees it
    const orderId = generateUUID();
    const statusToken = generateToken();
    const updateToken = generateToken();

    const order: Order = {
      id: orderId,
      createdAt: new Date().toISOString(),
      customerName: formFields.customerName.trim(),
      customerPhone: formatPhoneNumber(formFields.customerPhone),
      siteAddress: formFields.siteAddress.trim(),
      landmark: formFields.landmark?.trim() || undefined,
      deliveryType: formFields.deliveryType,
      scheduledTime: formFields.scheduledTime || undefined,
      items: pricedItems,
      subtotal,
      convenienceFee,
      total: serverTotal,
      paymentMethod: 'razorpay',
      status: 'received',
      statusToken,
      updateToken,
      userId: session?.userId,
    };

    const dbSuccess = await createOrder(order);
    if (!dbSuccess) {
      logger.error('Payment', 'create-order — DB write failed', { orderId });
      logger.api('POST', '/api/payment/create-order', 502, Date.now() - start);
      return NextResponse.json({ error: 'Failed to create order. Please try again.' }, { status: 502 });
    }

    // Now create the Razorpay order using the DB order ID as the receipt reference
    let razorpayOrder;
    try {
      razorpayOrder = await createRazorpayOrder(serverTotal, currency, orderId);
    } catch (err) {
      logger.error('Payment', 'Razorpay order creation failed', {
        orderId,
        error: err instanceof Error ? err.message : JSON.stringify(err),
      });
      // Keep the DB order — the user can still see their order details even though
      // payment couldn't be initiated. paymentStatus stays NULL (unpaid).
      logger.api('POST', '/api/payment/create-order', 502, Date.now() - start);
      return NextResponse.json(
        { error: 'Payment gateway unavailable. Please try again.', statusToken },
        { status: 502 }
      );
    }

    // Persist the Razorpay order ID so verify-payment can cross-reference it
    await setRazorpayOrderId(orderId, razorpayOrder.id);

    logger.info('Payment', 'Razorpay order created', {
      orderId,
      razorpayOrderId: razorpayOrder.id,
      amountPaise: razorpayOrder.amount,
    });
    logger.api('POST', '/api/payment/create-order', 200, Date.now() - start);

    return NextResponse.json({
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,   // paise — passed directly to Razorpay checkout.js
      currency: razorpayOrder.currency,
      orderId,
      statusToken,
    });
  } catch (error) {
    logger.error('Payment', 'create-order — unhandled error', {
      error: error instanceof Error ? error.message : String(error),
    });
    logger.api('POST', '/api/payment/create-order', 500, Date.now() - start);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
