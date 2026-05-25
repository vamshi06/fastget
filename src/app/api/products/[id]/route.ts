import { NextRequest, NextResponse } from 'next/server';
import { getProductById } from '@/lib/products';

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
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Product ID is required' },
        { status: 400 }
      );
    }

    const product = await getProductById(id);

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: product,
      },
      {
        status: 200,
        headers: { 'Cache-Control': 'public, max-age=300' }, // Cache for 5 minutes
      }
    );
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch product' },
      { status: 500 }
    );
  }
}
