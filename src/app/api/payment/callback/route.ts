import { NextRequest, NextResponse } from 'next/server';
import { verifyPaymentSignature, fetchPayment } from '@/lib/razorpay';
import { confirmOrderPayment, getOrderRazorpayOrderId, cancelUnpaidOrder } from '@/lib/payment-db';
import { logger } from '@/lib/logger';

/**
 * POST /api/payment/callback
 *
 * Razorpay POSTs here after payment when callback_url is set in checkout options.
 * This is the correct approach for WebView / mobile environments where the JS
 * handler can't reliably fire after a UPI app redirects back.
 *
 * Query params (set by us in the callback_url):
 *   orderId     – our internal order ID
 *   statusToken – token for the order status page
 *
 * POST body (sent by Razorpay):
 *   razorpay_payment_id
 *   razorpay_order_id
 *   razorpay_signature
 */
export async function POST(request: NextRequest) {
  const origin = new URL(request.url).origin;
  const sp = request.nextUrl.searchParams;
  const orderId     = sp.get('orderId');
  const statusToken = sp.get('statusToken');

  const redirectError = (reason: string) =>
    NextResponse.redirect(`${origin}/checkout?payment_error=${encodeURIComponent(reason)}`, 303);

  if (!orderId || !statusToken) {
    return redirectError('Invalid payment callback — missing order reference.');
  }

  let razorpay_payment_id: string | null = null;
  let razorpay_order_id: string | null = null;
  let razorpay_signature: string | null = null;

  try {
    const text = await request.text();
    const body = Object.fromEntries(new URLSearchParams(text));
    razorpay_payment_id = body['razorpay_payment_id'] ?? null;
    razorpay_order_id   = body['razorpay_order_id']   ?? null;
    razorpay_signature  = body['razorpay_signature']  ?? null;
  } catch {
    return redirectError('Payment was cancelled or did not complete.');
  }

  // Razorpay redirects here even on cancellation — missing params means cancelled
  if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
    logger.info('Payment', 'callback — payment cancelled or incomplete', { orderId });
    await cancelUnpaidOrder(orderId);
    return redirectError('Payment was cancelled. Please try again.');
  }

  // Verify HMAC signature
  let isValid: boolean;
  try {
    isValid = verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
  } catch (err) {
    logger.error('Payment', 'callback — signature verification threw', {
      error: err instanceof Error ? err.message : String(err),
    });
    return redirectError('Payment verification failed.');
  }

  if (!isValid) {
    logger.warn('Payment', 'callback — invalid signature', { orderId });
    return redirectError('Payment signature mismatch. Please contact support.');
  }

  // Verify razorpay_order_id matches what we stored for this order
  const storedRazorpayOrderId = await getOrderRazorpayOrderId(orderId);
  if (!storedRazorpayOrderId || storedRazorpayOrderId !== razorpay_order_id) {
    logger.warn('Payment', 'callback — razorpay_order_id mismatch', { orderId, razorpay_order_id });
    return redirectError('Payment order reference mismatch. Please contact support.');
  }

  // Signature only proves the response came from Razorpay — fetch actual status
  let payment: Awaited<ReturnType<typeof fetchPayment>>;
  try {
    payment = await fetchPayment(razorpay_payment_id);
  } catch (err) {
    logger.error('Payment', 'callback — Razorpay fetch failed', {
      orderId,
      error: err instanceof Error ? err.message : String(err),
    });
    return redirectError('Could not verify payment status. Please contact support.');
  }

  if (payment.status !== 'captured' && payment.status !== 'authorized') {
    logger.warn('Payment', 'callback — payment not captured', {
      orderId,
      status: payment.status,
    });
    await cancelUnpaidOrder(orderId);
    return redirectError(`Payment was not completed (status: ${payment.status}). Please try again.`);
  }

  // Record payment in DB
  const confirmed = await confirmOrderPayment(
    orderId,
    razorpay_payment_id,
    razorpay_order_id,
    razorpay_signature,
  );

  if (!confirmed) {
    logger.error('Payment', 'callback — DB update failed', { orderId });
    return redirectError('Payment recorded but order update failed. Please contact support.');
  }

  logger.info('Payment', 'callback — payment confirmed', { orderId, razorpay_payment_id });
  return NextResponse.redirect(`${origin}/order/${statusToken}`, 303);
}
