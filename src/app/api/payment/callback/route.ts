import { NextRequest, NextResponse } from 'next/server';
import { verifyPaymentSignature, fetchPayment } from '@/lib/razorpay';
import { confirmOrderPayment, deleteOrder } from '@/lib/payment-db';
import { verifyOrderToken } from '@/lib/order-token';
import { createOrder } from '@/lib/db';
import { generateUUID, generateToken } from '@/lib/utils';
import { Order } from '@/types';
import { logger } from '@/lib/logger';

/**
 * POST /api/payment/callback
 *
 * Razorpay POSTs here after payment when callback_url is set in checkout options.
 * This is the correct approach for WebView / mobile environments where the JS
 * handler can't reliably fire after a UPI app redirects back.
 *
 * Query params (set by the caller in the callback_url):
 *   orderToken – HMAC-signed token from /api/payment/create-order
 *
 * POST body (sent by Razorpay):
 *   razorpay_payment_id
 *   razorpay_order_id
 *   razorpay_signature
 */
export async function POST(request: NextRequest) {
  const origin = new URL(request.url).origin;
  const sp = request.nextUrl.searchParams;
  const orderToken = sp.get('orderToken');

  const redirectError = (reason: string) =>
    NextResponse.redirect(`${origin}/checkout?payment_error=${encodeURIComponent(reason)}`, 303);

  if (!orderToken) {
    return redirectError('Invalid payment callback — missing order reference.');
  }

  const orderData = verifyOrderToken(orderToken);
  if (!orderData) {
    return redirectError('Order session expired or invalid. Please start a new checkout.');
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

  if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
    logger.info('Payment', 'callback — payment cancelled or incomplete');
    return redirectError('Payment was cancelled. Please try again.');
  }

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
    logger.warn('Payment', 'callback — invalid signature');
    return redirectError('Payment signature mismatch. Please contact support.');
  }

  if (orderData.razorpayOrderId !== razorpay_order_id) {
    logger.warn('Payment', 'callback — razorpay_order_id mismatch', { razorpay_order_id });
    return redirectError('Payment order reference mismatch. Please contact support.');
  }

  let payment: Awaited<ReturnType<typeof fetchPayment>>;
  try {
    payment = await fetchPayment(razorpay_payment_id);
  } catch (err) {
    logger.error('Payment', 'callback — Razorpay fetch failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return redirectError('Could not verify payment status. Please contact support.');
  }

  if (payment.status !== 'captured' && payment.status !== 'authorized') {
    logger.warn('Payment', 'callback — payment not captured', { status: payment.status });
    return redirectError(`Payment was not completed (status: ${payment.status}). Please try again.`);
  }

  // Payment confirmed — create the order in the DB
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
    logger.error('Payment', 'callback — DB write failed', { orderId });
    return redirectError('Failed to save order. Please contact support.');
  }

  const confirmed = await confirmOrderPayment(
    orderId,
    razorpay_payment_id,
    razorpay_order_id,
    razorpay_signature,
  );

  if (!confirmed) {
    logger.error('Payment', 'callback — payment confirmation DB update failed', { orderId });
    await deleteOrder(orderId);
    return redirectError('Payment recorded but order save failed. Please contact support.');
  }

  logger.info('Payment', 'callback — payment confirmed and order created', { orderId, razorpay_payment_id });
  return NextResponse.redirect(`${origin}/order/${statusToken}`, 303);
}
