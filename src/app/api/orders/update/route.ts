import { NextRequest, NextResponse } from 'next/server';
import { updateOrderStatusInSheets } from '@/lib/sheets';
import { OrderStatus } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { updateToken, status, pin, eta } = body;

    if (!updateToken || !status || !pin) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return NextResponse.json(
        { error: 'Invalid PIN format' },
        { status: 400 }
      );
    }

    const result = await updateOrderStatusInSheets(
      updateToken,
      status as OrderStatus,
      pin,
      eta
    );

    if (result.success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: result.error || 'Failed to update order' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
