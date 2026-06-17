import { NextRequest, NextResponse } from 'next/server';
import { getOrderById } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { logger } from '@/lib/logger';

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
  logger.api('GET', '/api/orders/by-id/[id]', 200, 0);
  return NextResponse.json({ order: safe }, { headers: { 'Cache-Control': 'no-store' } });
}
