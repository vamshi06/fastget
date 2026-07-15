import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { getOrderById, upsertOrderFeedback, deleteOrderFeedback, REVIEW_EDIT_WINDOW_MINUTES } from '@/lib/db';
import { logger } from '@/lib/logger';
import { ValidationError, requireString, requireInt, optionalString } from '@/lib/validation';

export const dynamic = 'force-dynamic';

/**
 * POST /api/feedback
 *
 * Submit or update delivery-experience feedback for an order. The order must
 * belong to the caller (session cookie — IDOR fix) and be 'delivered'.
 */
export async function POST(request: NextRequest) {
  const start = Date.now();
  const auth = await requireSession();
  if ('response' in auth) return auth.response;

  try {
    const body = await request.json();
    const orderId = requireString(body.orderId, 'order');
    const rating = requireInt(body.rating, 'rating', { min: 1, max: 5 });
    const comment = optionalString(body.comment, 'comment', { max: 2000 }) ?? null;

    const order = await getOrderById(orderId);
    if (!order || order.userId !== auth.session.userId) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }
    if (order.status !== 'delivered') {
      return NextResponse.json({ success: false, error: 'You can rate your delivery once the order is delivered' }, { status: 400 });
    }

    const result = await upsertOrderFeedback(orderId, auth.session.userId, rating, comment);
    if (!result.ok) {
      const status = result.reason === 'expired' ? 400 : 500;
      const error = result.reason === 'expired'
        ? `Feedback can only be edited within ${REVIEW_EDIT_WINDOW_MINUTES} minutes of submission`
        : 'Failed to save feedback';
      logger.api('POST', '/api/feedback', status, Date.now() - start);
      return NextResponse.json({ success: false, error }, { status });
    }

    logger.api('POST', '/api/feedback', 200, Date.now() - start);
    return NextResponse.json({ success: true, data: result.feedback });
  } catch (error) {
    if (error instanceof ValidationError) {
      logger.api('POST', '/api/feedback', 400, Date.now() - start);
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    logger.error('API', 'POST /api/feedback — unhandled error', {
      error: error instanceof Error ? error.message : String(error),
    });
    logger.api('POST', '/api/feedback', 500, Date.now() - start);
    return NextResponse.json({ success: false, error: 'Something went wrong on our end. Please try again in a few moments.' }, { status: 500 });
  }
}

/**
 * DELETE /api/feedback
 *
 * Delete the caller's own delivery feedback for an order (no edit-window
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

    const deleted = await deleteOrderFeedback(orderId, auth.session.userId);
    if (!deleted) {
      logger.api('DELETE', '/api/feedback', 404, Date.now() - start);
      return NextResponse.json({ success: false, error: 'Feedback not found' }, { status: 404 });
    }

    logger.api('DELETE', '/api/feedback', 200, Date.now() - start);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ValidationError) {
      logger.api('DELETE', '/api/feedback', 400, Date.now() - start);
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    logger.error('API', 'DELETE /api/feedback — unhandled error', {
      error: error instanceof Error ? error.message : String(error),
    });
    logger.api('DELETE', '/api/feedback', 500, Date.now() - start);
    return NextResponse.json({ success: false, error: 'Something went wrong on our end. Please try again in a few moments.' }, { status: 500 });
  }
}
