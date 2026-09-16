import { NextRequest, NextResponse } from 'next/server';
import { getCartByUserId, saveCart } from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { ValidationError } from '@/lib/validation';
import { CartItem } from '@/types';

const MAX_CART_ITEMS = 300;
const MAX_CART_BYTES = 200_000;

function validateCartItems(value: unknown): CartItem[] {
  if (!Array.isArray(value)) {
    throw new ValidationError('Cart items must be an array.');
  }
  if (value.length > MAX_CART_ITEMS) {
    throw new ValidationError(`Cart cannot have more than ${MAX_CART_ITEMS} items.`);
  }

  let size: number;
  try {
    size = Buffer.byteLength(JSON.stringify(value), 'utf8');
  } catch {
    throw new ValidationError('Cart items must be valid JSON.');
  }
  if (size > MAX_CART_BYTES) {
    throw new ValidationError('Cart data is too large.');
  }

  for (const item of value) {
    const product = (item as { product?: { id?: unknown } } | null)?.product;
    const quantity = (item as { quantity?: unknown } | null)?.quantity;
    if (
      typeof item !== 'object' || item === null ||
      typeof product !== 'object' || product === null || typeof product.id !== 'string' ||
      typeof quantity !== 'number' || !Number.isFinite(quantity) || quantity <= 0
    ) {
      throw new ValidationError('Each cart item must have a product with an id and a positive quantity.');
    }
  }

  return value as CartItem[];
}

// User is derived from the verified session cookie, never the request (same IDOR guard as /api/wishlist).
export async function GET(_request: NextRequest) {
  const start = Date.now();
  const auth = await requireSession();
  if ('response' in auth) return auth.response;

  try {
    const items = await getCartByUserId(auth.session.userId);
    logger.api('GET', '/api/cart', 200, Date.now() - start);
    return NextResponse.json({ items });
  } catch (error) {
    logger.error('API', 'GET /api/cart — unhandled error', {
      error: error instanceof Error ? error.message : String(error),
    });
    logger.api('GET', '/api/cart', 500, Date.now() - start);
    return NextResponse.json({ error: 'Something went wrong on our end. Please try again in a few moments.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const start = Date.now();
  const auth = await requireSession();
  if ('response' in auth) return auth.response;

  try {
    const body = await request.json();
    const items = validateCartItems(body.items);

    const success = await saveCart(auth.session.userId, items);
    if (!success) {
      logger.api('PUT', '/api/cart', 500, Date.now() - start);
      return NextResponse.json({ error: 'Failed to save cart' }, { status: 500 });
    }

    logger.api('PUT', '/api/cart', 200, Date.now() - start);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ValidationError) {
      logger.api('PUT', '/api/cart', 400, Date.now() - start);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    logger.error('API', 'PUT /api/cart — unhandled error', {
      error: error instanceof Error ? error.message : String(error),
    });
    logger.api('PUT', '/api/cart', 500, Date.now() - start);
    return NextResponse.json({ error: 'Something went wrong on our end. Please try again in a few moments.' }, { status: 500 });
  }
}
