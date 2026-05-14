import { NextRequest, NextResponse } from 'next/server';
import { getOrderByUpdateToken } from '@/lib/db';

/**
 * GET /api/orders/agent-token/[token]
 *
 * Retrieve an order by its update token (agent access).
 * Does NOT return the statusToken for security.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    const normalizedToken = token?.toLowerCase();

    if (!normalizedToken) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const order = await getOrderByUpdateToken(normalizedToken);

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Return order without statusToken for security
    const { statusToken, ...orderWithoutStatusToken } = order;

    return NextResponse.json(orderWithoutStatusToken, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('Error fetching order by agent token:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
