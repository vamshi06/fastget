import { NextRequest, NextResponse } from 'next/server';
import { getProductWithVariants } from '@/lib/products';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/products/[id]
 * Returns a product with all its variants and inventory data.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const start = Date.now();
  try {
    const { id } = await context.params;

    logger.info('API', `GET /api/products/${id}`);

    if (!id) {
      logger.api('GET', '/api/products/[id]', 400, Date.now() - start);
      return NextResponse.json({ success: false, error: 'Product ID is required' }, { status: 400 });
    }

    const product = await getProductWithVariants(id);

    if (!product) {
      logger.api('GET', '/api/products/[id]', 404, Date.now() - start);
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    logger.api('GET', '/api/products/[id]', 200, Date.now() - start);

    return NextResponse.json(
      { success: true, data: product },
      { status: 200, headers: { 'Cache-Control': 'public, max-age=30' } },
    );
  } catch (error) {
    logger.error('API', 'GET /api/products/[id] — unhandled error', {
      error: error instanceof Error ? error.message : String(error),
    });
    logger.api('GET', '/api/products/[id]', 500, Date.now() - start);
    return NextResponse.json({ success: false, error: 'Failed to fetch product' }, { status: 500 });
  }
}
