import { NextRequest, NextResponse } from 'next/server';
import { getOrderByStatusToken } from '@/lib/db';

/**
 * GET /api/orders/[token]
 *
 * Retrieve an order by its status token (customer-facing endpoint).
 * Does NOT return the agent updateToken.
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

    const order = await getOrderByStatusToken(normalizedToken);

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Return order without sensitive updateToken
    return NextResponse.json(
      {
        success: true,
        order: {
          id: order.id,
          createdAt: order.createdAt,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          siteAddress: order.siteAddress,
          landmark: order.landmark,
          deliveryType: order.deliveryType,
          scheduledTime: order.scheduledTime,
          items: order.items,
          subtotal: order.subtotal,
          convenienceFee: order.convenienceFee,
          total: order.total,
          paymentMethod: order.paymentMethod,
          status: order.status,
          eta: order.eta,
          statusToken: order.statusToken,
          // updateToken intentionally omitted
        },
      },
      {
        status: 200,
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
