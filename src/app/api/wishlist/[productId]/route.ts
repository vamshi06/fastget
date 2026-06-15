import { NextRequest, NextResponse } from 'next/server';
import { removeFromWishlist } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  const start = Date.now();
  const userId = request.nextUrl.searchParams.get('userId');
  const productId = decodeURIComponent(params.productId);

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  try {
    const success = await removeFromWishlist(userId, productId);
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
