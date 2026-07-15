import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { getOrderById, upsertProductReview, getProductReviews, deleteProductReview, REVIEW_EDIT_WINDOW_MINUTES } from '@/lib/db';
import { logger } from '@/lib/logger';
import { ValidationError, requireString, requireInt, optionalString } from '@/lib/validation';

export const dynamic = 'force-dynamic';

/**
 * GET /api/reviews?productCode=XYZ
 *
 * Public. Returns all reviews for a product plus its average rating, for
 * display on the product detail page.
 */
export async function GET(request: NextRequest) {
  const start = Date.now();
  try {
    const productCode = request.nextUrl.searchParams.get('productCode');
    if (!productCode) {
      return NextResponse.json({ success: false, error: 'productCode is required' }, { status: 400 });
    }

    const { reviews, average, count } = await getProductReviews(productCode);
    logger.api('GET', '/api/reviews', 200, Date.now() - start);
    return NextResponse.json(
      { success: true, data: { reviews, average, count } },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    logger.error('API', 'GET /api/reviews — unhandled error', {
      error: error instanceof Error ? error.message : String(error),
    });
    logger.api('GET', '/api/reviews', 500, Date.now() - start);
    return NextResponse.json({ success: false, error: 'Something went wrong on our end. Please try again in a few moments.' }, { status: 500 });
  }
}

/**
 * POST /api/reviews
 *
 * Submit or update a product review. The order must belong to the caller
 * (session cookie, not the request body — IDOR fix), be 'delivered', and
 * actually contain the product being reviewed.
 */
export async function POST(request: NextRequest) {
  const start = Date.now();
  const auth = await requireSession();
  if ('response' in auth) return auth.response;

  try {
    const body = await request.json();
    const orderId = requireString(body.orderId, 'order');
    const productCode = requireString(body.productCode, 'product', { max: 255 });
    const rating = requireInt(body.rating, 'rating', { min: 1, max: 5 });
    const comment = optionalString(body.comment, 'comment', { max: 2000 }) ?? null;

    const order = await getOrderById(orderId);
    if (!order || order.userId !== auth.session.userId) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }
    if (order.status !== 'delivered') {
      return NextResponse.json({ success: false, error: 'You can review a product once your order is delivered' }, { status: 400 });
    }
    const orderItem = order.items.find((item) => item.sku === productCode);
    if (!orderItem) {
      return NextResponse.json({ success: false, error: 'This product was not part of that order' }, { status: 400 });
    }

    const result = await upsertProductReview(orderId, auth.session.userId, productCode, orderItem.name, rating, comment);
    if (!result.ok) {
      const status = result.reason === 'expired' ? 400 : 500;
      const error = result.reason === 'expired'
        ? `Reviews can only be edited within ${REVIEW_EDIT_WINDOW_MINUTES} minutes of submission`
        : 'Failed to save review';
      logger.api('POST', '/api/reviews', status, Date.now() - start);
      return NextResponse.json({ success: false, error }, { status });
    }

    logger.api('POST', '/api/reviews', 200, Date.now() - start);
    return NextResponse.json({ success: true, data: result.review });
  } catch (error) {
    if (error instanceof ValidationError) {
      logger.api('POST', '/api/reviews', 400, Date.now() - start);
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    logger.error('API', 'POST /api/reviews — unhandled error', {
      error: error instanceof Error ? error.message : String(error),
    });
    logger.api('POST', '/api/reviews', 500, Date.now() - start);
    return NextResponse.json({ success: false, error: 'Something went wrong on our end. Please try again in a few moments.' }, { status: 500 });
  }
}

/**
 * DELETE /api/reviews
 *
 * Delete the caller's own review for a product on an order (no edit-window
 * restriction). Scoped to the session user — never trusts a userId from the
 * request body.
 */
export async function DELETE(request: NextRequest) {
  const start = Date.now();
  const auth = await requireSession();
  if ('response' in auth) return auth.response;

  try {
    const body = await request.json();
    const orderId = requireString(body.orderId, 'order');
    const productCode = requireString(body.productCode, 'product', { max: 255 });

    const deleted = await deleteProductReview(orderId, auth.session.userId, productCode);
    if (!deleted) {
      logger.api('DELETE', '/api/reviews', 404, Date.now() - start);
      return NextResponse.json({ success: false, error: 'Review not found' }, { status: 404 });
    }

    logger.api('DELETE', '/api/reviews', 200, Date.now() - start);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ValidationError) {
      logger.api('DELETE', '/api/reviews', 400, Date.now() - start);
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    logger.error('API', 'DELETE /api/reviews — unhandled error', {
      error: error instanceof Error ? error.message : String(error),
    });
    logger.api('DELETE', '/api/reviews', 500, Date.now() - start);
    return NextResponse.json({ success: false, error: 'Something went wrong on our end. Please try again in a few moments.' }, { status: 500 });
  }
}
