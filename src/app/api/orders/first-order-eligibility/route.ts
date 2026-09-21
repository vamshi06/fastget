import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { hasUserOrderedBefore } from '@/lib/db';
import { FIRST_ORDER_DISCOUNT_RUPEES, FIRST_ORDER_MIN_ORDER_RUPEES } from '@/lib/order-pricing';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/orders/first-order-eligibility
 *
 * Whether the logged-in user still qualifies for the first-order coupon (for
 * the checkout summary display only — the actual discount is always
 * recomputed server-side in priceOrderFromCatalog, never trusted from here).
 */
export async function GET() {
  const auth = await requireSession();
  if ('response' in auth) return auth.response;

  try {
    const orderedBefore = await hasUserOrderedBefore(auth.session.userId);
    return NextResponse.json({
      eligible: !orderedBefore,
      discountAmount: FIRST_ORDER_DISCOUNT_RUPEES,
      minOrderValue: FIRST_ORDER_MIN_ORDER_RUPEES,
    });
  } catch (error) {
    logger.error('API', 'GET /api/orders/first-order-eligibility — unhandled error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Something went wrong on our end. Please try again in a few moments.' }, { status: 500 });
  }
}
