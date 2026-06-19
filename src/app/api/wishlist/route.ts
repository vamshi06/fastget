import { NextRequest, NextResponse } from 'next/server';
import { getWishlistByUserId, addToWishlist } from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { logger } from '@/lib/logger';

// User is derived from the verified session cookie, never the request (IDOR fix, C3).
export async function GET(_request: NextRequest) {
  const start = Date.now();
  const auth = await requireSession();
  if ('response' in auth) return auth.response;

  try {
    const items = await getWishlistByUserId(auth.session.userId);
    logger.api('GET', '/api/wishlist', 200, Date.now() - start);
    return NextResponse.json({ items });
  } catch (error) {
    logger.error('API', 'GET /api/wishlist — unhandled error', {
      error: error instanceof Error ? error.message : String(error),
    });
    logger.api('GET', '/api/wishlist', 500, Date.now() - start);
    return NextResponse.json({ error: 'Something went wrong on our end. Please try again in a few moments.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const start = Date.now();
  const auth = await requireSession();
  if ('response' in auth) return auth.response;

  try {
    const body = await request.json();
    const { productId, productData } = body;

    if (!productId) {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 });
    }

    const success = await addToWishlist(auth.session.userId, productId, productData ?? {});
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
    return NextResponse.json({ error: 'Something went wrong on our end. Please try again in a few moments.' }, { status: 500 });
  }
}
