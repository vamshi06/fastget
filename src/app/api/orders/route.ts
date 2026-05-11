import { NextRequest, NextResponse } from 'next/server';
import { Order, OrderStatus } from '@/types';
import { 
  generateUUID, 
  generateToken, 
  formatPhoneNumber,
  validateOrderForm 
} from '@/lib/utils';
import { createOrder } from '@/lib/db';

/**
 * POST /api/orders
 * 
 * Create a new order with customer details and cart items
 * Generates unique status and update tokens for order tracking/management
 * 
 * Request body:
 * - customerName (string, required): Customer name
 * - customerPhone (string, required): Customer phone number
 * - siteAddress (string, required): Delivery address
 * - landmark (string, optional): Landmark or building name
 * - deliveryType ('urgent' | 'scheduled', required): Delivery type
 * - scheduledTime (string, optional): ISO timestamp for scheduled delivery
 * - items (Array, required): Cart items array with product and quantity
 * - subtotal (number, required): Subtotal in paise
 * - convenienceFee (number, required): Convenience fee in paise
 * - total (number, required): Total amount in paise
 * 
 * Responses:
 * - 201: { success: true, orderId, statusToken, status } - Order created
 * - 400: { error: string } - Validation error
 * - 502: { error: string } - Database error
 * - 500: { error: string } - Unexpected server error
 */
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

    // Save to Neon database
    const success = await createOrder(order);
    
    if (!success) {
      console.error('Failed to save order to Neon database', { orderId });
      return NextResponse.json(
        { error: 'We could not place the order right now. Please try again.' },
        { status: 502 }
      );
    }

    // Return order details to client
    // statusToken: for customer to view order status
    // updateToken: for agents to manage order (NOT returned to customer)
    return NextResponse.json({
      success: true,
      orderId: order.id,
      statusToken: order.statusToken,
      updateToken: order.updateToken,
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
