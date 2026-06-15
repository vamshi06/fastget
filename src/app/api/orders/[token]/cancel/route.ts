import { NextRequest, NextResponse } from 'next/server';
import { cancelOrderByStatusToken } from '@/lib/db';

export async function POST(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  const token = params.token.toLowerCase();

  const result = await cancelOrderByStatusToken(token);

  if (!result.cancelled) {
    const status =
      result.reason === 'Order not found'
        ? 404
        : result.reason === 'Order is already cancelled' || result.reason === 'Delivered orders cannot be cancelled'
          ? 409
          : result.reason === 'Order cannot be cancelled once it is out for delivery'
            ? 422
            : 500;
    return NextResponse.json({ success: false, error: result.reason }, { status });
  }

  return NextResponse.json({ success: true, cancelled: true });
}
