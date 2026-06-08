import {
  getOrCreateCategory,
  createProduct,
  createProductVariant,
  insertProductIntoCategoryTable,
} from '@/lib/products';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/** Generate a short unique product code: e.g. CARP-A1B2C3 */
function generateProductCode(categorySlug: string): string {
  const prefix = categorySlug.replace(/[_-]/g, '').toUpperCase().slice(0, 4);
  const suffix = Date.now().toString(36).toUpperCase().slice(-6);
  return `${prefix}-${suffix}`;
}

export async function POST(request: NextRequest) {
  const start = Date.now();
  logger.info('API', 'POST /admin/api/products');
  try {
    const body = await request.json();

    // ── Validation ────────────────────────────────────────────────
    if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
      return NextResponse.json({ success: false, error: 'Product name is required' }, { status: 400 });
    }
    if (!body.price || typeof body.price !== 'number' || body.price <= 0) {
      return NextResponse.json({ success: false, error: 'Price must be a number greater than 0' }, { status: 400 });
    }
    if (!body.categorySlug || typeof body.categorySlug !== 'string') {
      return NextResponse.json({ success: false, error: 'Category is required' }, { status: 400 });
    }

    // ── Resolve category ──────────────────────────────────────────
    const categoryName =
      body.categoryName ||
      body.categorySlug.replace(/[_-]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
    const category = await getOrCreateCategory(categoryName, body.categorySlug, body.categoryDescription);

    if (!category) {
      logger.error('API', 'POST /admin/api/products — failed to resolve category', { slug: body.categorySlug });
      logger.api('POST', '/admin/api/products', 500, Date.now() - start);
      return NextResponse.json({ success: false, error: 'Failed to resolve category' }, { status: 500 });
    }

    // ── Prices (rupees → paise) ───────────────────────────────────
    const priceInPaise = Math.round(body.price * 100);
    const mrpInPaise   = body.mrpPrice ? Math.round(body.mrpPrice * 100) : undefined;
    const status       = ['active', 'inactive', 'discontinued'].includes(body.status) ? body.status : 'active';
    const moq          = typeof body.moq === 'number' && body.moq > 0 ? body.moq : 1;
    const stock        = typeof body.stockQuantity === 'number' ? body.stockQuantity : 0;

    // product_code is the PK of every category table — must never be empty
    const productCode = body.productCode?.trim() || generateProductCode(body.categorySlug);

    // ── Insert into products table ────────────────────────────────
    const product = await createProduct(
      body.name.trim(),
      priceInPaise,
      body.description?.trim() || undefined,
      category.id,
      {
        brand:       body.brand?.trim()    || undefined,
        uom:         body.uom?.trim()      || undefined,
        imageUrl:    body.imageUrl?.trim() || undefined,
        productCode,
        status,
      }
    );

    if (!product) {
      logger.error('API', 'POST /admin/api/products — product creation failed');
      logger.api('POST', '/admin/api/products', 500, Date.now() - start);
      return NextResponse.json({ success: false, error: 'Failed to create product in database' }, { status: 500 });
    }

    // ── Insert variant ────────────────────────────────────────────
    const sku     = body.sku?.trim() || productCode;
    const variant = await createProductVariant(product.id, sku, stock, {}, undefined, mrpInPaise, moq);

    if (!variant) {
      logger.warn('Products', 'Variant creation failed, product was still created', { productId: product.id, sku });
    }

    // ── Insert into category-specific table (makes it visible in catalog/admin list) ──
    const catalogInserted = await insertProductIntoCategoryTable(body.categorySlug, {
      productCode,
      name:        body.name.trim(),
      brand:       body.brand?.trim()        || undefined,
      description: body.description?.trim()  || undefined,
      price:       priceInPaise,
      mrpPrice:    mrpInPaise,
      moq,
      uom:         body.uom?.trim()          || undefined,
      imageUrl:    body.imageUrl?.trim()     || undefined,
      status,
      variantId:   variant?.id,
      productsId:  product.id,
    });

    if (!catalogInserted) {
      logger.warn('Products', 'Category table insert failed; product exists in products table only', {
        productId: product.id,
        categorySlug: body.categorySlug,
      });
    }

    logger.info('Products', 'Product created via admin', { productId: product.id, productCode, sku });
    logger.api('POST', '/admin/api/products', 201, Date.now() - start);

    return NextResponse.json(
      {
        success: true,
        data: {
          id:          product.id,
          productCode,
          name:        product.name,
          categoryId:  category.id,
          price:       product.price,
          sku:         variant?.sku,
          inCatalog:   catalogInserted,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('API', 'POST /admin/api/products — unhandled error', {
      error: error instanceof Error ? error.message : String(error),
    });
    logger.api('POST', '/admin/api/products', 500, Date.now() - start);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
