import { NextRequest, NextResponse } from 'next/server';
import { verifyPaymentSignature, fetchPayment } from '@/lib/razorpay';
import { confirmOrderPayment, getStatusToken, getOrderRazorpayOrderId } from '@/lib/payment-db';
import { logger } from '@/lib/logger';

/**
 * POST /api/payment/verify-payment
 *
 * Verifies the Razorpay payment signature using HMAC SHA256, then marks the
 * order as paid by storing the razorpay_payment_id.
 *
 * Body: { razorpay_payment_id, razorpay_order_id, razorpay_signature, orderId }
 *
 * Response: { success: true, statusToken } | { error: string }
 *
 * SECURITY: The secret key never leaves this route handler.  Signature
 * verification uses constant-time comparison to prevent timing attacks.
 */
export async function POST(request: NextRequest) {
  const start = Date.now();
  logger.info('Payment', 'POST /api/payment/verify-payment');

  try {
    const body = await request.json();
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, orderId } = body;

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !orderId) {
      logger.warn('Payment', 'verify-payment — missing fields', { orderId });
      logger.api('POST', '/api/payment/verify-payment', 400, Date.now() - start);
      return NextResponse.json({ error: 'Missing required payment fields' }, { status: 400 });
    }

    // Verify Razorpay HMAC SHA256 signature
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
      logger.warn('Payment', 'verify-payment — invalid signature', { orderId, razorpay_order_id });
      logger.api('POST', '/api/payment/verify-payment', 400, Date.now() - start);
      return NextResponse.json({ error: 'Payment verification failed. Signature mismatch.' }, { status: 400 });
    }

    // Bind the Razorpay order to OUR order (same check the callback route does).
    // A valid signature only proves the (order_id, payment_id) pair came from
    // Razorpay — NOT that this razorpay_order_id belongs to the internal orderId
    // the client supplied. Without this, an attacker could confirm an expensive
    // order using a valid signature from a cheap payment they made on a different
    // order. Razorpay fixes a payment's amount to its order, so binding the order
    // also locks the amount.
    const storedRazorpayOrderId = await getOrderRazorpayOrderId(orderId);
    if (!storedRazorpayOrderId || storedRazorpayOrderId !== razorpay_order_id) {
      logger.warn('Payment', 'verify-payment — razorpay_order_id does not match order', { orderId, razorpay_order_id });
      logger.api('POST', '/api/payment/verify-payment', 400, Date.now() - start);
      return NextResponse.json({ error: 'Payment order reference mismatch.' }, { status: 400 });
    }

    // Signature only proves the response came from Razorpay — NOT that the payment
    // was successful. Cancelled/failed UPI payments also produce a valid signature.
    // Fetch the actual payment status from Razorpay before recording anything.
    let payment: Awaited<ReturnType<typeof fetchPayment>>;
    try {
      payment = await fetchPayment(razorpay_payment_id);
    } catch (err) {
      logger.error('Payment', 'verify-payment — Razorpay payment fetch failed', {
        orderId,
        razorpay_payment_id,
        error: err instanceof Error ? err.message : String(err),
      });
      logger.api('POST', '/api/payment/verify-payment', 502, Date.now() - start);
      return NextResponse.json({ error: 'Could not verify payment status with Razorpay.' }, { status: 502 });
    }

    if (payment.status !== 'captured' && payment.status !== 'authorized') {
      logger.warn('Payment', 'verify-payment — payment not captured', {
        orderId,
        razorpay_payment_id,
        status: payment.status,
      });
      logger.api('POST', '/api/payment/verify-payment', 400, Date.now() - start);
      return NextResponse.json(
        { error: `Payment was not completed (status: ${payment.status}). Please try again.` },
        { status: 400 },
      );
    }

    // Mark order as paid
    const confirmed = await confirmOrderPayment(orderId, razorpay_payment_id, razorpay_order_id, razorpay_signature);
    if (!confirmed) {
      logger.error('Payment', 'verify-payment — DB update failed', { orderId });
      logger.api('POST', '/api/payment/verify-payment', 502, Date.now() - start);
      return NextResponse.json({ error: 'Failed to record payment. Contact support.' }, { status: 502 });
    }

    const statusToken = await getStatusToken(orderId);

    logger.info('Payment', 'Payment verified and recorded', { orderId, razorpay_payment_id });
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
