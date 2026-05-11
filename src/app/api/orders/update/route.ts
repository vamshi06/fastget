import { NextRequest, NextResponse } from 'next/server';
import { getOrderByUpdateToken, updateOrderStatus } from '@/lib/db';
import { OrderStatus } from '@/types';

/**
 * POST /api/orders/update
 * 
 * Update an order's status with PIN authentication
 * Only agents with the correct PIN can update order status
 * Status transitions are validated against VALID_STATUS_TRANSITIONS
 * 
 * Request body:
 * - updateToken (string, required): Token from order creation
 * - status (OrderStatus, required): Target status (e.g., 'eta_assigned')
 * - pin (string, required): 4-digit agent PIN
 * - eta (string, optional): ETA string for customer (e.g., '30 minutes')
 * 
 * Responses:
 * - 200: { success: true, order: Order } - Status updated successfully
 * - 400: { error: string } - Invalid request or state transition
 * - 401: { error: string } - Invalid PIN
 * - 404: { error: string } - Order not found
 * - 500: { error: string } - Server error
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { updateToken, status, pin, eta } = body;
    const normalizedToken = updateToken.toLowerCase();

    // Validate required fields
    if (!normalizedToken || !status || !pin) {
      return NextResponse.json(
        { error: 'Missing required fields: updateToken, status, pin' },
        { status: 400 }
      );
    }

    // Validate PIN format (4 digits)
    if (typeof pin !== 'string' || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
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
      return NextResponse.json(
        { error: 'Invalid PIN' },
        { status: 401 }
      );
    }

    // Handle order not found
    if (!result.success && result.error === 'Order not found') {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Handle invalid state transition (status conflict)
    if (!result.success && result.error?.startsWith('Cannot transition')) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    // Handle other errors
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to update order status' },
        { status: 400 }
      );
    }

    // Success: fetch updated order and return it
    const updatedOrder = await getOrderByUpdateToken(updateToken);
    if (!updatedOrder) {
      // This shouldn't happen but handle gracefully
      return NextResponse.json(
        { success: true, message: 'Order status updated' },
        { status: 200 }
      );
    }

    return NextResponse.json({
      success: true,
      order: {
        id: updatedOrder.id,
        status: updatedOrder.status,
        eta: updatedOrder.eta,
        updatedAt: new Date().toISOString(),
      },
    }, { status: 200 });

  } catch (error) {
    console.error('Error updating order status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
