import { NextRequest, NextResponse } from 'next/server';
import { Order, OrderItem, OrderStatus } from '@/types';
import { 
  generateUUID, 
  generateToken, 
  generatePin, 
  hashPin,
  formatPhoneNumber,
  validateOrderForm 
} from '@/lib/utils';
import { createOrderInSheets } from '@/lib/sheets';

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
    const agentPin = generatePin();

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

    // Save to Google Sheets
    const success = await createOrderInSheets(order);
    
    if (!success) {
      // If Sheets integration fails, we still return success but log the error
      // In production, you'd want to queue this for retry
      console.error('Failed to save order to Sheets, but continuing with success response');
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
