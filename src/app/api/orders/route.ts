import { NextRequest, NextResponse } from 'next/server';
import { Order, OrderStatus } from '@/types';
import {
  generateUUID,
  generateToken,
  formatPhoneNumber,
  validateOrderForm,
} from '@/lib/utils';
import { createOrder } from '@/lib/db';

/**
 * POST /api/orders
 *
 * Create a new order with customer details and cart items.
 * Generates unique status and update tokens for order tracking/management.
 *
 * SECURITY: updateToken is NOT returned to the client — it is only for
 * agents who access orders through the agent dashboard directly.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate order form data
    const validationError = validateOrderForm(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const { items, subtotal, convenienceFee, total } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    // Basic numeric validation to prevent garbage data in DB
    if (
      typeof subtotal !== 'number' ||
      typeof convenienceFee !== 'number' ||
      typeof total !== 'number' ||
      subtotal < 0 ||
      convenienceFee < 0 ||
      total < 0
    ) {
      return NextResponse.json({ error: 'Invalid order totals' }, { status: 400 });
    }

    // Generate tokens and IDs
    const orderId = generateUUID();
    const statusToken = generateToken();
    const updateToken = generateToken();

    // Build order object
    const order: Order = {
      id: orderId,
      createdAt: new Date().toISOString(),
      customerName: body.customerName.trim(),
      customerPhone: formatPhoneNumber(body.customerPhone),
      siteAddress: body.siteAddress.trim(),
      landmark: body.landmark?.trim() || undefined,
      deliveryType: body.deliveryType,
      scheduledTime: body.scheduledTime || undefined,
      items: items.map(
        (item: { product: { id: string; name: string; price: number }; quantity: number }) => ({
          sku: item.product.id,
          name: item.product.name,
          quantity: item.quantity,
          price: item.product.price,
        })
      ),
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

    // SECURITY: Return only statusToken — updateToken is intentionally omitted
    // so the customer's browser never holds agent-level access.
    return NextResponse.json(
      {
        success: true,
        orderId: order.id,
        statusToken: order.statusToken,
        status: order.status,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
