import { NextRequest, NextResponse } from 'next/server';
import { getProductsFromCategoryTables, getProductCatalog } from '@/lib/products';
import { logger } from '@/lib/logger';

// Public browse endpoint: sanitize/clamp query params rather than reject, so a
// malformed param degrades gracefully instead of breaking the catalog.
function clampInt(raw: string | null, def: number, min: number, max: number): number {
  const n = parseInt(raw ?? '', 10);
  if (!Number.isFinite(n)) return def;
  return Math.min(Math.max(n, min), max);
}

function clampPrice(raw: string | null): number | undefined {
  if (raw === null || raw.trim() === '') return undefined;
  const n = parseFloat(raw);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return n;
}

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
    const category = sp.get('category')?.slice(0, 80) || undefined;
    const search   = sp.get('q')?.slice(0, 100) || undefined;
    const limit    = clampInt(sp.get('limit'), 24, 1, 500);
    const offset   = clampInt(sp.get('offset'), 0, 0, 1_000_000);
    let   minPrice = clampPrice(sp.get('min_price'));
    let   maxPrice = clampPrice(sp.get('max_price'));
    // Drop an inverted range rather than silently returning nothing.
    if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
      minPrice = undefined;
      maxPrice = undefined;
    }

    logger.info('API', 'GET /api/products', { category, search, limit, offset, minPrice, maxPrice });

    if (process.env.DEBUG_CATALOG === '1') {
      console.debug('[api/products] selected category:', category ?? '(all)');
      console.debug('[api/products] applied filters:', { search, limit, offset, minPrice, maxPrice });
    }

    // Use category tables by default; fall back to legacy products table
    const useLegacy = process.env.LEGACY_PRODUCTS_TABLE === '1';
    const fetchFn   = useLegacy ? getProductCatalog : getProductsFromCategoryTables;
    const { products, total } = await fetchFn({ categorySlug: category, search, limit, offset, minPrice, maxPrice });

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
