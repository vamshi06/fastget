import { NextRequest, NextResponse } from 'next/server';
import { getAllCategories } from '@/lib/products';

/**
 * GET /api/categories
 *
 * Retrieve all product categories.
 * Returns: Array of categories with id, name, slug, description
 */
export async function GET(request: NextRequest) {
  try {
    const categories = await getAllCategories();

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
        headers: { 'Cache-Control': 'public, max-age=600' }, // Cache for 10 minutes
      }
    );
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}
