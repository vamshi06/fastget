import { NextRequest, NextResponse } from 'next/server';
import { getOrderByUpdateToken, updateOrderStatus } from '@/lib/db';
import { OrderStatus } from '@/types';

/**
 * POST /api/orders/update
 *
 * Update an order's status with PIN authentication.
 * Status transitions are validated against VALID_STATUS_TRANSITIONS.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { updateToken, status, pin, eta } = body;

    const normalizedToken = updateToken?.toLowerCase();

    // Validate required fields
    if (!normalizedToken || !status || !pin) {
      return NextResponse.json(
        { error: 'Missing required fields: updateToken, status, pin' },
        { status: 400 }
      );
    }

    // Validate PIN format (4 digits)
    if (typeof pin !== 'string' || !/^\d{4}$/.test(pin)) {
      return NextResponse.json(
        { error: 'Invalid PIN format (must be 4 digits)' },
        { status: 400 }
      );
    }

    // Call update function with PIN authentication
    const result = await updateOrderStatus(
      normalizedToken,
      status as OrderStatus,
      pin,
      eta
    );

    // Handle authentication failure (wrong PIN)
    if (!result.success && result.error === 'Invalid PIN') {
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
    }

    // Handle order not found
    if (!result.success && result.error === 'Order not found') {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Handle invalid state transition
    if (!result.success && result.error?.startsWith('Cannot transition')) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Handle other errors
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to update order status' },
        { status: 400 }
      );
    }

    // Return updated data directly — avoids re-fetching from potentially stale replica
    return NextResponse.json(
      {
        success: true,
        order: {
          id: result.orderId,
          status: status,
          eta: eta || null,
          updatedAt: new Date().toISOString(),
        },
      },
      {
        status: 200,
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  } catch (error) {
    console.error('Error updating order status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
