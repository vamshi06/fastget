import { createCategory, createProduct, createProductVariant } from '@/lib/products';
import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

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

    // Convert category to slug format
    const categorySlug = body.category.toLowerCase().replace(/\s+/g, '-');
    
    // Get or create category
    let category = await createCategory(body.category, categorySlug, body.categoryDescription || '');
    
    if (!category) {
      return NextResponse.json(
        { success: false, error: 'Failed to create category' },
        { status: 500 }
      );
    }

    // Convert price to paise (multiply by 100 if in rupees)
    const priceInPaise = Math.round(body.price * 100);

    // Create product in Neon database
    const product = await createProduct(
      body.name.trim(),
      priceInPaise,
      body.description.trim(),
      category.id
    );

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Failed to create product in database' },
        { status: 500 }
      );
    }

    // Create variant if SKU provided (optional)
    if (body.sku && body.sku.trim()) {
      const stock = body.stock || 0;
      const variant = await createProductVariant(
        product.id,
        body.sku.trim(),
        stock,
        body.attributes || {}
      );
      
      if (!variant) {
        console.warn('Failed to create variant, but product was created');
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id: product.id,
          name: product.name,
          categoryId: category.id,
          price: product.price,
          message: 'Product created successfully in Neon database',
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
