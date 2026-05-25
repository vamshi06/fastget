import { NextRequest, NextResponse } from 'next/server';
import { getActiveProducts, getAllCategories } from '@/lib/products';

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
  try {
    const categorySlug = request.nextUrl.searchParams.get('category');
    const limitParam = request.nextUrl.searchParams.get('limit');
    const limit = limitParam ? Math.min(parseInt(limitParam), 1000) : 100;

    let products = await getActiveProducts();

    // Filter by category if provided
    if (categorySlug) {
      products = products.filter((p) => (p as any).categorySlug === categorySlug || p.categoryId === categorySlug);
    }

    // Limit results
    products = products.slice(0, limit);

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
        headers: { 'Cache-Control': 'public, max-age=300' }, // Cache for 5 minutes
      }
    );
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}
