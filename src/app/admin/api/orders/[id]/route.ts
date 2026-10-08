import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { adminDeleteOrder } from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/**
 * DELETE /admin/api/orders/[id]
 *
 * Admin-only: permanently removes a CANCELLED order. Live and delivered orders
 * are refused (409) - cancel first. Associated product reviews and delivery
 * feedback cascade-delete with it.
 */
export async function DELETE(_request: NextRequest, ctx: Ctx) {
  const auth = await requireRole('admin');
  if ('response' in auth) return auth.response;
  const start = Date.now();

  try {
    const { id } = await ctx.params;
    const result = await adminDeleteOrder(id);
    if (result === 'not_found') {
      logger.api('DELETE', '/admin/api/orders/[id]', 404, Date.now() - start);
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }
    if (result === 'not_cancelled') {
      logger.api('DELETE', '/admin/api/orders/[id]', 409, Date.now() - start);
      return NextResponse.json(
        { success: false, error: 'Only cancelled orders can be deleted. Cancel the order first.' },
        { status: 409 },
      );
    }
    if (result === 'error') {
      logger.api('DELETE', '/admin/api/orders/[id]', 500, Date.now() - start);
      return NextResponse.json({ success: false, error: 'Failed to delete the order. Please try again.' }, { status: 500 });
    }

    logger.info('API', 'Admin deleted order', { orderId: id, adminUserId: auth.session.userId });
    logger.api('DELETE', '/admin/api/orders/[id]', 200, Date.now() - start);
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('API', 'DELETE /admin/api/orders/[id] - unhandled error', {
      error: error instanceof Error ? error.message : String(error),
    });
    logger.api('DELETE', '/admin/api/orders/[id]', 500, Date.now() - start);
    return NextResponse.json({ success: false, error: 'Something went wrong on our end. Please try again in a few moments.' }, { status: 500 });
  }
}
