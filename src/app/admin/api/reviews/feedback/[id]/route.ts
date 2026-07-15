import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { adminDeleteOrderFeedback } from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/**
 * DELETE /admin/api/reviews/feedback/[id]
 *
 * Admin moderation: remove any order delivery feedback, no ownership check.
 */
export async function DELETE(_request: NextRequest, ctx: Ctx) {
  const auth = await requireRole('admin');
  if ('response' in auth) return auth.response;
  const start = Date.now();

  try {
    const { id } = await ctx.params;
    const deleted = await adminDeleteOrderFeedback(id);
    if (!deleted) {
      logger.api('DELETE', '/admin/api/reviews/feedback/[id]', 404, Date.now() - start);
      return NextResponse.json({ success: false, error: 'Feedback not found' }, { status: 404 });
    }

    logger.api('DELETE', '/admin/api/reviews/feedback/[id]', 200, Date.now() - start);
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('API', 'DELETE /admin/api/reviews/feedback/[id] — unhandled error', {
      error: error instanceof Error ? error.message : String(error),
    });
    logger.api('DELETE', '/admin/api/reviews/feedback/[id]', 500, Date.now() - start);
    return NextResponse.json({ success: false, error: 'Something went wrong on our end. Please try again in a few moments.' }, { status: 500 });
  }
}
