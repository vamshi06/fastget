import { NextRequest, NextResponse } from 'next/server';
import { createRazorpayOrder } from '@/lib/razorpay';
import { createOrder } from '@/lib/db';
import { setRazorpayOrderId, deleteOrder } from '@/lib/payment-db';
import { generateUUID, generateToken, formatPhoneNumber, validateOrderForm } from '@/lib/utils';
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
 * Body: { ...orderFormData, items, subtotal, convenienceFee, total, currency? }
 *
 * Response: { razorpayOrderId, amount (paise), currency, orderId, statusToken }
 */
export async function POST(request: NextRequest) {
  const start = Date.now();
  logger.info('Payment', 'POST /api/payment/create-order');

  try {
    const body = await request.json();
    const { currency = 'INR', items, subtotal, convenienceFee, total, ...formFields } = body;

    // Re-use the same form validation as the COD orders flow
    const validationError = validateOrderForm(formFields);
    if (validationError) {
      logger.warn('Payment', 'create-order — validation failed', { reason: validationError });
      logger.api('POST', '/api/payment/create-order', 400, Date.now() - start);
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    if (
      typeof subtotal !== 'number' ||
      typeof convenienceFee !== 'number' ||
      typeof total !== 'number' ||
      subtotal < 0 ||
      convenienceFee < 0 ||
      total <= 0
    ) {
      return NextResponse.json({ error: 'Invalid order totals' }, { status: 400 });
    }

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
      paymentMethod: 'razorpay',
      status: 'received',
      statusToken,
      updateToken,
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
      razorpayOrder = await createRazorpayOrder(total, currency, orderId);
    } catch (err) {
      logger.error('Payment', 'Razorpay order creation failed', {
        orderId,
        error: err instanceof Error ? err.message : String(err),
      });
      // Clean up the DB order so it doesn't sit as an orphaned 'received' order
      await deleteOrder(orderId);
      logger.api('POST', '/api/payment/create-order', 502, Date.now() - start);
      return NextResponse.json({ error: 'Payment gateway unavailable. Please try again.' }, { status: 502 });
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
