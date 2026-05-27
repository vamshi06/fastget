import { NextRequest, NextResponse } from 'next/server';
import { getProductById } from '@/lib/products';
import { logger } from '@/lib/logger';

/**
 * GET /api/products/[id]
 *
 * Retrieve a single product by ID.
 * Returns: product object with full details including variants
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
      logger.warn('API', 'GET /api/products/[id] — missing id');
      logger.api('GET', '/api/products/[id]', 400, Date.now() - start);
      return NextResponse.json(
        { success: false, error: 'Product ID is required' },
        { status: 400 }
      );
    }

    const product = await getProductById(id);

    if (!product) {
      logger.warn('API', 'GET /api/products/[id] — product not found', { id });
      logger.api('GET', '/api/products/[id]', 404, Date.now() - start);
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    logger.debug('API', 'GET /api/products/[id] — product found', { id });
    logger.api('GET', '/api/products/[id]', 200, Date.now() - start);

    return NextResponse.json(
      {
        success: true,
        data: product,
      },
      {
        status: 200,
        headers: { 'Cache-Control': 'public, max-age=300' },
      }
    );
  } catch (error) {
    logger.error('API', 'GET /api/products/[id] — unhandled error', { error: error instanceof Error ? error.message : String(error) });
    logger.api('GET', '/api/products/[id]', 500, Date.now() - start);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch product' },
      { status: 500 }
    );
  }
}
