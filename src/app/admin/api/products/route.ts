import { createProductInSheets } from '@/lib/sheets';
import { Product } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validation
    if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Product name is required' },
        { status: 400 }
      );
    }

    if (!body.price || typeof body.price !== 'number' || body.price <= 0) {
      return NextResponse.json(
        { success: false, error: 'Price must be a number greater than 0' },
        { status: 400 }
      );
    }

    if (!body.description || typeof body.description !== 'string' || !body.description.trim()) {
      return NextResponse.json(
        { success: false, error: 'Description is required' },
        { status: 400 }
      );
    }

    if (!body.category || typeof body.category !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Category is required' },
        { status: 400 }
      );
    }

    if (!body.stockStatus || typeof body.stockStatus !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Stock status is required' },
        { status: 400 }
      );
    }

    // Validate category
    const validCategories = ['carpentry', 'plumbing', 'hardware', 'electrical', 'adhesives'];
    if (!validCategories.includes(body.category)) {
      return NextResponse.json(
        { success: false, error: 'Invalid category' },
        { status: 400 }
      );
    }

    // Validate stock status
    const validStockStatuses = ['in_stock', 'low', 'out'];
    if (!validStockStatuses.includes(body.stockStatus)) {
      return NextResponse.json(
        { success: false, error: 'Invalid stock status' },
        { status: 400 }
      );
    }

    // Create product object
    const product: Product = {
      id: body.id || `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: body.name.trim(),
      description: body.description.trim(),
      price: body.price,
      unit: body.unit || 'pc',
      category: body.category,
      imageUrl: body.imageUrl && typeof body.imageUrl === 'string' ? body.imageUrl.trim() : undefined,
      stockStatus: body.stockStatus,
    };

    // Create product in Google Sheets
    const success = await createProductInSheets(product);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to save product to database' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id: product.id,
          name: product.name,
          message: 'Product created successfully',
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
