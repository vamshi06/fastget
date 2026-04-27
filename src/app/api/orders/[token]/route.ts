import { NextRequest, NextResponse } from 'next/server';
import { getOrderFromSheets } from '@/lib/sheets';

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;
    
    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    const order = await getOrderFromSheets(token);
    
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Return order without sensitive tokens
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
    });

  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
