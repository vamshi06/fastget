import { NextRequest, NextResponse } from 'next/server';
import { getWishlistByUserId, addToWishlist } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const start = Date.now();
  const userId = request.nextUrl.searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  try {
    const items = await getWishlistByUserId(userId);
    logger.api('GET', '/api/wishlist', 200, Date.now() - start);
    return NextResponse.json({ items });
  } catch (error) {
    logger.error('API', 'GET /api/wishlist — unhandled error', {
      error: error instanceof Error ? error.message : String(error),
    });
    logger.api('GET', '/api/wishlist', 500, Date.now() - start);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const start = Date.now();

  try {
    const body = await request.json();
    const { userId, productId, productData } = body;

    if (!userId || !productId) {
      return NextResponse.json({ error: 'userId and productId are required' }, { status: 400 });
    }

    const success = await addToWishlist(userId, productId, productData ?? {});
    if (!success) {
      logger.api('POST', '/api/wishlist', 500, Date.now() - start);
      return NextResponse.json({ error: 'Failed to add to wishlist' }, { status: 500 });
    }

    logger.api('POST', '/api/wishlist', 200, Date.now() - start);
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('API', 'POST /api/wishlist — unhandled error', {
      error: error instanceof Error ? error.message : String(error),
    });
    logger.api('POST', '/api/wishlist', 500, Date.now() - start);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
