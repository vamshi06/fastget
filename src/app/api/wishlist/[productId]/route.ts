import { NextRequest, NextResponse } from 'next/server';
import { removeFromWishlist } from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { logger } from '@/lib/logger';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { productId: string } }
) {
  const start = Date.now();
  const auth = await requireSession();
  if ('response' in auth) return auth.response;
  const productId = decodeURIComponent(params.productId);

  try {
    // removeFromWishlist matches on (user_id AND product_id) — IDOR fix (C3).
    const success = await removeFromWishlist(auth.session.userId, productId);
    if (!success) {
      logger.api('DELETE', '/api/wishlist/[productId]', 500, Date.now() - start);
      return NextResponse.json({ error: 'Failed to remove from wishlist' }, { status: 500 });
    }

    logger.api('DELETE', '/api/wishlist/[productId]', 200, Date.now() - start);
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('API', 'DELETE /api/wishlist/[productId] — unhandled error', {
      error: error instanceof Error ? error.message : String(error),
    });
    logger.api('DELETE', '/api/wishlist/[productId]', 500, Date.now() - start);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
