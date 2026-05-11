import { NextRequest, NextResponse } from 'next/server';
import { getOrderByStatusToken } from '@/lib/db';

/**
 * GET /api/orders/[token]
 * 
 * Retrieve an order by its status token (customer-facing endpoint)
 * Used on the order tracking page to show customer their order status
 * Does NOT return sensitive agent token (updateToken)
 * 
 * Route params:
 * - token (string, required): The status_token from order creation response
 * 
 * Responses:
 * - 200: { success: true, order: Order } - Order found
 * - 404: { error: string } - Order not found
 * - 500: { error: string } - Server error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;
    const normalizedToken = token.toLowerCase();
    
    if (!normalizedToken) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    const order = await getOrderByStatusToken(normalizedToken);
    
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Return order without sensitive tokens
    // Only statusToken is included for reference, never include updateToken to customer
    return NextResponse.json({
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
      },
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
