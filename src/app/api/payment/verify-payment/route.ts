import { NextRequest, NextResponse } from 'next/server';
import { verifyPaymentSignature, fetchPayment } from '@/lib/razorpay';
import { confirmOrderPayment, deleteOrder } from '@/lib/payment-db';
import { verifyOrderToken } from '@/lib/order-token';
import { createOrder } from '@/lib/db';
import { generateUUID, generateToken } from '@/lib/utils';
import { Order } from '@/types';
import { logger } from '@/lib/logger';

/**
 * POST /api/payment/verify-payment
 *
 * Verifies the Razorpay payment and, only on confirmed capture, creates the
 * order in the DB.  No DB record exists before this point — the `orderToken`
 * carries the HMAC-signed, server-validated order data from `create-order`.
 *
 * Body: { razorpay_payment_id, razorpay_order_id, razorpay_signature, orderToken }
 *
 * Response: { success: true, statusToken } | { error: string }
 */
export async function POST(request: NextRequest) {
  const start = Date.now();
  logger.info('Payment', 'POST /api/payment/verify-payment');

  try {
    const body = await request.json();
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, orderToken } = body;

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !orderToken) {
      logger.warn('Payment', 'verify-payment — missing fields');
      logger.api('POST', '/api/payment/verify-payment', 400, Date.now() - start);
      return NextResponse.json({ error: 'Missing required payment fields' }, { status: 400 });
    }

    // Verify HMAC signature from Razorpay
    let isValid: boolean;
    try {
      isValid = verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
    } catch (err) {
      logger.error('Payment', 'Signature verification threw', {
        error: err instanceof Error ? err.message : String(err),
      });
      logger.api('POST', '/api/payment/verify-payment', 500, Date.now() - start);
      return NextResponse.json({ error: 'Something went wrong on our end. Please try again in a few moments.' }, { status: 500 });
    }

    if (!isValid) {
      logger.warn('Payment', 'verify-payment — invalid signature', { razorpay_order_id });
      logger.api('POST', '/api/payment/verify-payment', 400, Date.now() - start);
      return NextResponse.json({ error: 'Payment verification failed. Signature mismatch.' }, { status: 400 });
    }

    // Verify and decode the server-signed order token
    const orderData = verifyOrderToken(orderToken);
    if (!orderData) {
      logger.warn('Payment', 'verify-payment — invalid or expired orderToken');
      logger.api('POST', '/api/payment/verify-payment', 400, Date.now() - start);
      return NextResponse.json(
        { error: 'Order session expired or invalid. Please start a new checkout.' },
        { status: 400 }
      );
    }

    // Bind the Razorpay order to the order data we signed (anti-swap protection).
    // The signature only proves the (order_id, payment_id) pair came from Razorpay;
    // this check confirms the payment is for exactly the order the user initiated.
    if (orderData.razorpayOrderId !== razorpay_order_id) {
      logger.warn('Payment', 'verify-payment — razorpay_order_id does not match orderToken', {
        razorpay_order_id,
        tokenOrderId: orderData.razorpayOrderId,
      });
      logger.api('POST', '/api/payment/verify-payment', 400, Date.now() - start);
      return NextResponse.json({ error: 'Payment order reference mismatch.' }, { status: 400 });
    }

    // Signature proves the response came from Razorpay — NOT that payment succeeded.
    // Cancelled/failed UPI payments also produce a valid signature, so fetch the
    // actual payment status.
    let payment: Awaited<ReturnType<typeof fetchPayment>>;
    try {
      payment = await fetchPayment(razorpay_payment_id);
    } catch (err) {
      logger.error('Payment', 'verify-payment — Razorpay payment fetch failed', {
        razorpay_payment_id,
        error: err instanceof Error ? err.message : String(err),
      });
      logger.api('POST', '/api/payment/verify-payment', 502, Date.now() - start);
      return NextResponse.json({ error: 'Could not verify payment status with Razorpay.' }, { status: 502 });
    }

    if (payment.status !== 'captured' && payment.status !== 'authorized') {
      logger.warn('Payment', 'verify-payment — payment not captured', {
        razorpay_payment_id,
        status: payment.status,
      });
      logger.api('POST', '/api/payment/verify-payment', 400, Date.now() - start);
      return NextResponse.json(
        { error: `Payment was not completed (status: ${payment.status}). Please try again.` },
        { status: 400 },
      );
    }

    // Payment confirmed — now create the order in the DB
    const orderId = generateUUID();
    const statusToken = generateToken();
    const updateToken = generateToken();

    const order: Order = {
      id: orderId,
      createdAt: new Date().toISOString(),
      customerName: orderData.customerName,
      customerPhone: orderData.customerPhone,
      siteAddress: orderData.siteAddress,
      landmark: orderData.landmark,
      deliveryType: orderData.deliveryType,
      scheduledTime: orderData.scheduledTime,
      items: orderData.items,
      subtotal: orderData.subtotal,
      convenienceFee: orderData.convenienceFee,
      total: orderData.total,
      paymentMethod: 'razorpay',
      status: 'received',
      statusToken,
      updateToken,
      userId: orderData.userId,
    };

    const dbSuccess = await createOrder(order);
    if (!dbSuccess) {
      logger.error('Payment', 'verify-payment — DB write failed', { orderId });
      logger.api('POST', '/api/payment/verify-payment', 502, Date.now() - start);
      return NextResponse.json({ error: 'Failed to save order. Please contact support.' }, { status: 502 });
    }

    const confirmed = await confirmOrderPayment(orderId, razorpay_payment_id, razorpay_order_id, razorpay_signature);
    if (!confirmed) {
      logger.error('Payment', 'verify-payment — payment confirmation DB update failed', { orderId });
      await deleteOrder(orderId);
      logger.api('POST', '/api/payment/verify-payment', 502, Date.now() - start);
      return NextResponse.json({ error: 'Failed to record payment. Contact support.' }, { status: 502 });
    }

    logger.info('Payment', 'Payment verified and order created', { orderId, razorpay_payment_id });
    logger.api('POST', '/api/payment/verify-payment', 200, Date.now() - start);

    return NextResponse.json({ success: true, statusToken });
  } catch (error) {
    logger.error('Payment', 'verify-payment — unhandled error', {
      error: error instanceof Error ? error.message : String(error),
    });
    logger.api('POST', '/api/payment/verify-payment', 500, Date.now() - start);
    return NextResponse.json({ error: 'Something went wrong on our end. Please try again in a few moments.' }, { status: 500 });
  }
}
