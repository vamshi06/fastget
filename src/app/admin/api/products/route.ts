import { createCategory, createProduct, createProductVariant } from '@/lib/products';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const start = Date.now();
  logger.info('API', 'POST /admin/api/products');
  try {
    const body = await request.json();

    // Validation
    if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
      logger.warn('API', 'POST /admin/api/products — missing name');
      logger.api('POST', '/admin/api/products', 400, Date.now() - start);
      return NextResponse.json(
        { success: false, error: 'Product name is required' },
        { status: 400 }
      );
    }

    if (!body.price || typeof body.price !== 'number' || body.price <= 0) {
      logger.warn('API', 'POST /admin/api/products — invalid price');
      logger.api('POST', '/admin/api/products', 400, Date.now() - start);
      return NextResponse.json(
        { success: false, error: 'Price must be a number greater than 0' },
        { status: 400 }
      );
    }

    if (!body.description || typeof body.description !== 'string' || !body.description.trim()) {
      logger.warn('API', 'POST /admin/api/products — missing description');
      logger.api('POST', '/admin/api/products', 400, Date.now() - start);
      return NextResponse.json(
        { success: false, error: 'Description is required' },
        { status: 400 }
      );
    }

    if (!body.category || typeof body.category !== 'string') {
      logger.warn('API', 'POST /admin/api/products — missing category');
      logger.api('POST', '/admin/api/products', 400, Date.now() - start);
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
      logger.error('API', 'POST /admin/api/products — failed to create category', { category: body.category });
      logger.api('POST', '/admin/api/products', 500, Date.now() - start);
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
      logger.error('API', 'POST /admin/api/products — product creation failed');
      logger.api('POST', '/admin/api/products', 500, Date.now() - start);
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
        logger.warn('Products', 'Variant creation failed, product was still created', { productId: product.id, sku: body.sku });
      }
    }

    logger.info('Products', 'Product created via admin', { productId: product.id, name: product.name });
    logger.api('POST', '/admin/api/products', 201, Date.now() - start);

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
    logger.error('API', 'POST /admin/api/products — unhandled error', { error: error instanceof Error ? error.message : String(error) });
    logger.api('POST', '/admin/api/products', 500, Date.now() - start);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
