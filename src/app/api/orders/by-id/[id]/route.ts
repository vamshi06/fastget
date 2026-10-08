import { NextRequest, NextResponse } from 'next/server';
import { getOrderById } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { getAvailableStockByProductCodes } from '@/lib/products';
import { findStockProblems, type StockProblem } from '@/lib/order-stock';

/**
 * GET /api/orders/by-id/[id]
 *
 * Admin-only fetch of a single order by its UUID, used by the agent management
 * screen. Capability tokens (update/status) are stripped so they never reach the
 * browser (C4).
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole('admin');
  if ('response' in auth) return auth.response;

  const { id } = await context.params;
  const order = await getOrderById(id);
  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  // Never expose the capability tokens to the client.
  const { updateToken: _u, statusToken: _s, ...safe } = order;

  // Items the recorded stock can't cover - only relevant while the order is open.
  let stockProblems: Record<string, StockProblem> = {};
  if (order.status !== 'delivered' && order.status !== 'cancelled') {
    const stock = await getAvailableStockByProductCodes(order.items.map((i) => i.sku));
    stockProblems = Object.fromEntries(findStockProblems(order.items, stock));
  }

  logger.api('GET', '/api/orders/by-id/[id]', 200, 0);
  return NextResponse.json({ order: safe, stockProblems }, { headers: { 'Cache-Control': 'no-store' } });
}
