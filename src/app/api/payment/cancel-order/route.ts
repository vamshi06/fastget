import { NextResponse } from 'next/server';

/**
 * POST /api/payment/cancel-order
 *
 * No longer in use — orders are only created in the DB after payment is
 * confirmed, so there is nothing to cancel when the user dismisses the modal.
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
