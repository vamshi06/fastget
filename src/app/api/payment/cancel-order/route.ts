import { NextRequest, NextResponse } from 'next/server';
import { cancelUnpaidOrder } from '@/lib/payment-db';
import { logger } from '@/lib/logger';

/**
 * POST /api/payment/cancel-order
 *
 * Called by the client when the user closes the Razorpay modal without paying
 * (modal.ondismiss). Marks the DB order as 'cancelled' so the order page shows
 * the correct state rather than "Order Received" with no payment.
 *
 * The DB update is conditional (payment_status IS NULL) so it is safe to call
 * even if a payment callback races in — a captured payment won't be cancelled.
 */
export async function POST(request: NextRequest) {
  try {
    const { orderId } = await request.json();
    if (!orderId || typeof orderId !== 'string') {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }

    const cancelled = await cancelUnpaidOrder(orderId);
    logger.info('Payment', 'cancel-order — order cancelled', { orderId, cancelled });
    return NextResponse.json({ success: true, cancelled });
  } catch (error) {
    logger.error('Payment', 'cancel-order — unhandled error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Something went wrong on our end. Please try again in a few moments.' }, { status: 500 });
  }
}
