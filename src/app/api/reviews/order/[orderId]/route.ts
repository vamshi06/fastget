import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { getOrderById, getUserProductReviewsForOrder, getOrderFeedback } from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ orderId: string }> };

/**
 * GET /api/reviews/order/[orderId]
 *
 * Returns the caller's review state for one of their own orders: whether it's
 * eligible for review (delivered), each item paired with any existing review,
 * and any delivery feedback already submitted. Powers the "rate your order"
 * UI on the My Orders page.
 */
export async function GET(_request: NextRequest, ctx: Ctx) {
  const start = Date.now();
  const auth = await requireSession();
  if ('response' in auth) return auth.response;

  try {
    const { orderId } = await ctx.params;
    const order = await getOrderById(orderId);
    if (!order || order.userId !== auth.session.userId) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    const [reviews, feedback] = await Promise.all([
      getUserProductReviewsForOrder(orderId, auth.session.userId),
      getOrderFeedback(orderId, auth.session.userId),
    ]);

    const reviewsBySku = new Map(reviews.map((r) => [r.productCode, r]));
    const items = order.items.map((item) => ({
      sku: item.sku,
      name: item.name,
      review: reviewsBySku.get(item.sku) ?? null,
    }));

    logger.api('GET', '/api/reviews/order/[orderId]', 200, Date.now() - start);
    return NextResponse.json(
      {
        success: true,
        data: {
          canReview: order.status === 'delivered',
          items,
          feedback,
        },
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    logger.error('API', 'GET /api/reviews/order/[orderId] — unhandled error', {
      error: error instanceof Error ? error.message : String(error),
    });
    logger.api('GET', '/api/reviews/order/[orderId]', 500, Date.now() - start);
    return NextResponse.json({ success: false, error: 'Something went wrong on our end. Please try again in a few moments.' }, { status: 500 });
  }
}
