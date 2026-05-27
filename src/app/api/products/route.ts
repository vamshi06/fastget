import { NextRequest, NextResponse } from 'next/server';
import { getActiveProducts } from '@/lib/products';
import { logger } from '@/lib/logger';

/**
 * GET /api/products?category=[slug]&limit=[number]
 *
 * Retrieve all active products, optionally filtered by category.
 * Query parameters:
 *   - category (optional): Filter by category slug
 *   - limit (optional): Max results, default 100
 *
 * Returns: Array of products with id, name, price, category info
 */
export async function GET(request: NextRequest) {
  const start = Date.now();
  try {
    const categorySlug = request.nextUrl.searchParams.get('category');
    const limitParam = request.nextUrl.searchParams.get('limit');
    const limit = limitParam ? Math.min(parseInt(limitParam), 1000) : 100;

    logger.info('API', 'GET /api/products', { categorySlug, limit });

    let products = await getActiveProducts();

    // Filter by category if provided
    if (categorySlug) {
      products = products.filter((p) => (p as any).categorySlug === categorySlug || p.categoryId === categorySlug);
    }

    // Limit results
    products = products.slice(0, limit);

    logger.debug('API', 'GET /api/products — fetched', { count: products.length });
    logger.api('GET', '/api/products', 200, Date.now() - start);

    return NextResponse.json(
      {
        success: true,
        data: {
          products,
          count: products.length,
        },
      },
      {
        status: 200,
        headers: { 'Cache-Control': 'public, max-age=300' },
      }
    );
  } catch (error) {
    logger.error('API', 'GET /api/products — unhandled error', { error: error instanceof Error ? error.message : String(error) });
    logger.api('GET', '/api/products', 500, Date.now() - start);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}
