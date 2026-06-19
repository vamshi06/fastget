import { NextRequest, NextResponse } from 'next/server';
import { createRazorpayOrder } from '@/lib/razorpay';
import { createOrderToken } from '@/lib/order-token';
import { formatPhoneNumber, validateOrderForm } from '@/lib/utils';
import { getSession } from '@/lib/auth';
import { priceOrderFromCatalog } from '@/lib/order-pricing';
import { logger } from '@/lib/logger';

/**
 * POST /api/payment/create-order
 *
 * Validates the order form, reprices from the trusted catalog (H1), creates a
 * Razorpay order, then returns an HMAC-signed `orderToken` that encapsulates the
 * validated order data.  No DB record is written here — the order is only
 * persisted in `verify-payment` after Razorpay confirms a successful capture.
 *
 * Body: { ...orderFormData, items, total?, currency? }
 *
 * Response: { razorpayOrderId, amount (paise), currency, orderToken }
 */
export async function POST(request: NextRequest) {
  const start = Date.now();
  logger.info('Payment', 'POST /api/payment/create-order');

  try {
    const body = await request.json();
    const { currency = 'INR', items, total, ...formFields } = body;

    const validationError = validateOrderForm(formFields);
    if (validationError) {
      logger.warn('Payment', 'create-order — validation failed', { reason: validationError });
      logger.api('POST', '/api/payment/create-order', 400, Date.now() - start);
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const pricing = await priceOrderFromCatalog(items, typeof total === 'number' ? total : undefined);
    if (!pricing.ok) {
      logger.warn('Payment', 'create-order — pricing rejected', { reason: pricing.error });
      logger.api('POST', '/api/payment/create-order', pricing.status, Date.now() - start);
      return NextResponse.json({ error: pricing.error }, { status: pricing.status });
    }
    const { items: pricedItems, subtotal, convenienceFee, total: serverTotal } = pricing.priced;

    const session = await getSession();

    let razorpayOrder;
    try {
      razorpayOrder = await createRazorpayOrder(serverTotal, currency);
    } catch (err) {
      logger.error('Payment', 'Razorpay order creation failed', {
        error: err instanceof Error ? err.message : JSON.stringify(err),
      });
      logger.api('POST', '/api/payment/create-order', 502, Date.now() - start);
      return NextResponse.json(
        { error: 'Payment gateway unavailable. Please try again.' },
        { status: 502 }
      );
    }

    const orderToken = createOrderToken({
      razorpayOrderId: razorpayOrder.id,
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
      userId: session?.userId,
    });

    logger.info('Payment', 'Razorpay order created', {
      razorpayOrderId: razorpayOrder.id,
      amountPaise: razorpayOrder.amount,
    });
    logger.api('POST', '/api/payment/create-order', 200, Date.now() - start);

    return NextResponse.json({
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      orderToken,
    });
  } catch (error) {
    logger.error('Payment', 'create-order — unhandled error', {
      error: error instanceof Error ? error.message : String(error),
    });
    logger.api('POST', '/api/payment/create-order', 500, Date.now() - start);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
