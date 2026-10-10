import { createOrder, debitCoins, hasOtherOrder } from '@/lib/db';
import {
  cancelRejectedPaidOrder,
  confirmOrderPayment,
  deleteOrder,
  getStatusTokenByPaymentId,
} from '@/lib/payment-db';
import { refundPayment } from '@/lib/razorpay';
import type { OrderTokenData } from '@/lib/order-token';
import { notifyStaffOfNewOrder } from '@/lib/order-notifications';
import { generateUUID, generateToken } from '@/lib/utils';
import { Order } from '@/types';
import { logger } from '@/lib/logger';

export type PaidOrderResult =
  | { ok: true; statusToken: string }
  | { ok: false; status: number; error: string };

interface RazorpayRefs {
  paymentId: string;
  orderId: string;
  signature: string;
}

/**
 * Turns a verified Razorpay payment into an order. Shared by verify-payment
 * (browser handler) and callback (mobile/UPI redirect) so both paths apply
 * the same checks. The caller must already have checked the signature, bound
 * the payment to the signed orderToken, and confirmed the payment succeeded.
 *
 * - Idempotent per payment: a replayed or duplicate request (both paths can
 *   fire for one payment) returns the order that already holds it.
 * - Post-payment checks: if the first-order discount or the redeemed coins
 *   were already used by another order, the payment is refunded and the order
 *   cancelled - the customer paid a price they're no longer entitled to.
 */
export async function createPaidOrder(orderData: OrderTokenData, rz: RazorpayRefs): Promise<PaidOrderResult> {
  const existing = await getStatusTokenByPaymentId(rz.paymentId);
  if (existing) {
    logger.info('Payment', 'payment already has an order - returning it', { razorpayPaymentId: rz.paymentId });
    return { ok: true, statusToken: existing };
  }

  const order: Order = {
    id: generateUUID(),
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
    discount: orderData.discount || 0,
    total: orderData.total,
    paymentMethod: 'razorpay',
    status: 'received',
    statusToken: generateToken(),
    updateToken: generateToken(),
    userId: orderData.userId,
    referralCode: orderData.referralCode,
    referrerUserId: orderData.referrerUserId,
    sitePincode: orderData.sitePincode,
    siteLat: orderData.siteLat,
    siteLng: orderData.siteLng,
    gstin: orderData.gstin,
    businessName: orderData.businessName,
  };

  if (!(await createOrder(order))) {
    logger.error('Payment', 'paid order - DB write failed', { orderId: order.id, razorpayPaymentId: rz.paymentId });
    return { ok: false, status: 502, error: 'Failed to save order. Please contact support.' };
  }

  // Claims the payment for this order. If a concurrent request for the same
  // payment won the race, the unique index rejects this one - drop our copy
  // and return theirs.
  if (!(await confirmOrderPayment(order.id, rz.paymentId, rz.orderId, rz.signature))) {
    await deleteOrder(order.id);
    const winner = await getStatusTokenByPaymentId(rz.paymentId).catch(() => null);
    if (winner) return { ok: true, statusToken: winner };
    logger.error('Payment', 'paid order - payment confirmation DB update failed', { orderId: order.id });
    return { ok: false, status: 502, error: 'Failed to record payment. Contact support.' };
  }

  if (order.userId && order.discount > 0 && (await hasOtherOrder(order.userId, order.id))) {
    return rejectPaidOrder(order, rz.paymentId, 'first-order discount already used',
      'The first-order offer was already used on another order, so this payment has been refunded. Please place the order again.');
  }

  if (order.userId && orderData.coinsRedeemed && orderData.coinsRedeemed > 0) {
    if (!(await debitCoins(order.userId, orderData.coinsRedeemed, order.id))) {
      return rejectPaidOrder(order, rz.paymentId, 'coin debit failed',
        'Your coin balance changed before this payment completed, so it has been refunded. Please place the order again.');
    }
  }

  logger.info('Payment', 'Payment verified and order created', { orderId: order.id, razorpayPaymentId: rz.paymentId });

  // Best-effort staff alert (Telegram + email) - never blocks/fails the response.
  await notifyStaffOfNewOrder(order);

  return { ok: true, statusToken: order.statusToken };
}

async function rejectPaidOrder(order: Order, paymentId: string, reason: string, message: string): Promise<PaidOrderResult> {
  let refunded = false;
  try {
    await refundPayment(paymentId);
    refunded = true;
  } catch (err) {
    logger.error('Payment', 'paid order rejected - REFUND FAILED, refund manually', {
      orderId: order.id,
      razorpayPaymentId: paymentId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
  await cancelRejectedPaidOrder(order.id, refunded ? 'refunded' : 'refund_failed');
  logger.warn('Payment', 'paid order rejected after payment', { orderId: order.id, razorpayPaymentId: paymentId, reason, refunded });
  return {
    ok: false,
    status: 409,
    error: refunded ? message : 'This order could not be completed. Our team will refund your payment - please contact support.',
  };
}
