import { NextRequest, NextResponse } from 'next/server';
import { Order, OrderStatus } from '@/types';
import { 
  generateUUID, 
  generateToken, 
  formatPhoneNumber,
  validateOrderForm 
} from '@/lib/utils';
import { createOrder } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate order form data
    const validationError = validateOrderForm(body);
    if (validationError) {
      return NextResponse.json(
        { error: validationError },
        { status: 400 }
      );
    }

    // Get cart items from the request (they should be passed from the client)
    const { items, subtotal, convenienceFee, total } = body;
    
    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'Cart is empty' },
        { status: 400 }
      );
    }

    // Generate tokens and IDs
    const orderId = generateUUID();
    const statusToken = generateToken();
    const updateToken = generateToken();

    // Create order object
    const order: Order = {
      id: orderId,
      createdAt: new Date().toISOString(),
      customerName: body.customerName.trim(),
      customerPhone: formatPhoneNumber(body.customerPhone),
      siteAddress: body.siteAddress.trim(),
      landmark: body.landmark?.trim(),
      deliveryType: body.deliveryType,
      scheduledTime: body.scheduledTime,
      items: items.map((item: { product: { id: string; name: string; price: number }; quantity: number }) => ({
        sku: item.product.id,
        name: item.product.name,
        quantity: item.quantity,
        price: item.product.price,
      })),
      subtotal,
      convenienceFee,
      total,
      paymentMethod: 'cod',
      status: 'received' as OrderStatus,
      statusToken,
      updateToken,
    };

    // Save to database
    const success = await createOrder(order);
    
    if (!success) {
      console.error('Failed to save order to database');
      return NextResponse.json(
        { error: 'We could not place the order right now. Please try again.' },
        { status: 502 }
      );
    }

    // Return order details to client
    return NextResponse.json({
      success: true,
      orderId: order.id,
      statusToken: order.statusToken,
      status: order.status,
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
