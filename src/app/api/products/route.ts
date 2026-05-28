import { NextRequest, NextResponse } from 'next/server';
import { getProductsFromCategoryTables, getProductCatalog } from '@/lib/products';
import { logger } from '@/lib/logger';

/**
 * GET /api/products
 *
 * Primary source: category-specific tables (carpentry, plumbing, etc.) via
 * the products_catalog_view UNION.
 * Fallback: original products table (via getProductCatalog) when category
 * tables are unavailable or LEGACY_PRODUCTS_TABLE=1 is set.
 *
 * Query params:
 *   category  – category slug (e.g. "carpentry", "plumbing")
 *   q         – free-text search
 *   limit     – max results (default 500, max 500)
 *   offset    – pagination offset (default 0)
 */
export async function GET(request: NextRequest) {
  const start = Date.now();
  try {
    const sp       = request.nextUrl.searchParams;
    const category = sp.get('category') || undefined;
    const search   = sp.get('q')        || undefined;
    const limit    = Math.min(parseInt(sp.get('limit')  ?? '500', 10), 500);
    const offset   = Math.max(parseInt(sp.get('offset') ?? '0',   10), 0);

    logger.info('API', 'GET /api/products', { category, search, limit, offset });

    if (process.env.DEBUG_CATALOG === '1') {
      console.debug('[api/products] selected category:', category ?? '(all)');
      console.debug('[api/products] applied filters:', { search, limit, offset });
    }

    // Use category tables by default; fall back to legacy products table
    const useLegacy = process.env.LEGACY_PRODUCTS_TABLE === '1';
    const fetchFn   = useLegacy ? getProductCatalog : getProductsFromCategoryTables;
    const { products, total } = await fetchFn({ categorySlug: category, search, limit, offset });

    if (process.env.DEBUG_CATALOG === '1') {
      console.debug('[api/products] returned count:', products.length, '/ total in DB:', total);
    }

    logger.api('GET', '/api/products', 200, Date.now() - start);

    return NextResponse.json(
      {
        success: true,
        data: {
          products,
          count: products.length,
          total,
          source: useLegacy ? 'products_table' : 'category_tables',
        },
      },
      {
        status: 200,
        headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' },
      },
    );
  } catch (error) {
    logger.error('API', 'GET /api/products — unhandled error', {
      error: error instanceof Error ? error.message : String(error),
    });
    logger.api('GET', '/api/products', 500, Date.now() - start);
    return NextResponse.json({ success: false, error: 'Failed to fetch products' }, { status: 500 });
  }
}
