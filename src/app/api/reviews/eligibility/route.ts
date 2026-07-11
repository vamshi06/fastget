import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { getUserReviewEligibilityForProduct } from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/reviews/eligibility?productCode=XYZ
 *
 * For the logged-in user: can they review this product, and have they
 * already? Powers the "Write a review" / "Edit your review" CTA on the
 * product detail page. `orderId` is the order to submit against — either an
 * unreviewed delivered purchase (new review) or the most recent reviewed one
 * (edit).
 */
export async function GET(request: NextRequest) {
  const start = Date.now();
  const auth = await requireSession();
  if ('response' in auth) return auth.response;

  try {
    const productCode = request.nextUrl.searchParams.get('productCode');
    if (!productCode) {
      return NextResponse.json({ success: false, error: 'productCode is required' }, { status: 400 });
    }

    const { eligibleOrderIds, reviews } = await getUserReviewEligibilityForProduct(auth.session.userId, productCode);
    const reviewedOrderIds = new Set(reviews.map((r) => r.orderId));
    const unreviewedOrderId = eligibleOrderIds.find((id) => !reviewedOrderIds.has(id)) ?? null;
    const existingReview = reviews[0] ?? null;

    logger.api('GET', '/api/reviews/eligibility', 200, Date.now() - start);
    return NextResponse.json(
      {
        success: true,
        data: {
          canReview: eligibleOrderIds.length > 0,
          orderId: unreviewedOrderId ?? existingReview?.orderId ?? null,
          existingReview,
        },
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    logger.error('API', 'GET /api/reviews/eligibility — unhandled error', {
      error: error instanceof Error ? error.message : String(error),
    });
    logger.api('GET', '/api/reviews/eligibility', 500, Date.now() - start);
    return NextResponse.json({ success: false, error: 'Something went wrong on our end. Please try again in a few moments.' }, { status: 500 });
  }
}
