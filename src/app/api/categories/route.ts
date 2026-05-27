import { NextRequest, NextResponse } from 'next/server';
import { getAllCategories } from '@/lib/products';
import { logger } from '@/lib/logger';

/**
 * GET /api/categories
 *
 * Retrieve all product categories.
 * Returns: Array of categories with id, name, slug, description
 */
export async function GET(request: NextRequest) {
  const start = Date.now();
  logger.info('API', 'GET /api/categories');
  try {
    const categories = await getAllCategories();

    logger.debug('API', 'GET /api/categories — fetched', { count: categories.length });
    logger.api('GET', '/api/categories', 200, Date.now() - start);

    return NextResponse.json(
      {
        success: true,
        data: {
          categories,
          count: categories.length,
        },
      },
      {
        status: 200,
        headers: { 'Cache-Control': 'public, max-age=600' },
      }
    );
  } catch (error) {
    logger.error('API', 'GET /api/categories — unhandled error', { error: error instanceof Error ? error.message : String(error) });
    logger.api('GET', '/api/categories', 500, Date.now() - start);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}
