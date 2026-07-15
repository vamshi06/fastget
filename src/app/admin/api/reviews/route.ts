import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { getAllProductReviewsForAdmin, getAllOrderFeedbackForAdmin } from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /admin/api/reviews
 *
 * Returns all product reviews and all order delivery feedback, newest first,
 * for the admin dashboard.
 */
export async function GET(_request: NextRequest) {
  const auth = await requireRole('admin');
  if ('response' in auth) return auth.response;
  const start = Date.now();

  try {
    const [reviews, feedback] = await Promise.all([
      getAllProductReviewsForAdmin(),
      getAllOrderFeedbackForAdmin(),
    ]);

    logger.api('GET', '/admin/api/reviews', 200, Date.now() - start);
    return NextResponse.json(
      { success: true, data: { reviews, feedback } },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    logger.error('API', 'GET /admin/api/reviews — unhandled error', {
      error: error instanceof Error ? error.message : String(error),
    });
    logger.api('GET', '/admin/api/reviews', 500, Date.now() - start);
    return NextResponse.json({ success: false, error: 'Something went wrong on our end. Please try again in a few moments.' }, { status: 500 });
  }
}
