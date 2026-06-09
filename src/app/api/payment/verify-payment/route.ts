import { NextRequest, NextResponse } from 'next/server';
import { verifyPaymentSignature } from '@/lib/razorpay';
import { confirmOrderPayment, getStatusToken } from '@/lib/payment-db';
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
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    if (!isValid) {
      logger.warn('Payment', 'verify-payment — invalid signature', { orderId, razorpay_order_id });
      logger.api('POST', '/api/payment/verify-payment', 400, Date.now() - start);
      return NextResponse.json({ error: 'Payment verification failed. Signature mismatch.' }, { status: 400 });
    }

    // Mark order as paid
    const confirmed = await confirmOrderPayment(orderId, razorpay_payment_id, razorpay_order_id);
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
