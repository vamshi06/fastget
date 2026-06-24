import { NextResponse } from 'next/server';

/**
 * POST /api/payment/cancel-order
 *
 * No longer in use — orders are only created in the DB after payment is
 * confirmed, so there is nothing to cancel when the user dismisses the modal.
 */
export async function POST() {
  return NextResponse.json({ success: true });
}
