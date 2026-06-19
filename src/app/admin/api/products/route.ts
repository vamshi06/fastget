import {
  getOrCreateCategory,
  createProduct,
  createProductVariant,
  insertProductIntoCategoryTable,
} from '@/lib/products';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { requireRole } from '@/lib/auth';
import {
  ValidationError,
  requireString,
  optionalString,
  requireNumber,
  optionalNumber,
  requireInt,
  optionalEnum,
  httpUrl,
} from '@/lib/validation';

export const dynamic = 'force-dynamic';

const PRODUCT_STATUSES = ['active', 'inactive', 'discontinued'] as const;
const SLUG_PATTERN = /^[a-z0-9_-]+$/i;

/** Generate a short unique product code: e.g. CARP-A1B2C3 */
function generateProductCode(categorySlug: string): string {
  const prefix = categorySlug.replace(/[_-]/g, '').toUpperCase().slice(0, 4);
  const suffix = Date.now().toString(36).toUpperCase().slice(-6);
  return `${prefix}-${suffix}`;
}

export async function POST(request: NextRequest) {
  const auth = await requireRole('admin');
  if ('response' in auth) return auth.response;
  const start = Date.now();
  logger.info('API', 'POST /admin/api/products');
  try {
    const body = await request.json();

    // ── Validation ────────────────────────────────────────────────
    const name = requireString(body.name, 'product name', { max: 200 });
    const price = requireNumber(body.price, 'price', { min: 0.01 });
    const categorySlug = requireString(body.categorySlug, 'category', {
      max: 80,
      pattern: SLUG_PATTERN,
      patternMsg: 'Category has an invalid format.',
    });
    const categoryNameInput = optionalString(body.categoryName, 'category name', { max: 120 });
    const categoryDescription = optionalString(body.categoryDescription, 'category description', { max: 500 });
    const mrpPrice = optionalNumber(body.mrpPrice, 'MRP', { min: 0 });
    if (mrpPrice !== undefined && mrpPrice < price) {
      throw new ValidationError('MRP must be greater than or equal to price.');
    }
    const status = optionalEnum(body.status, PRODUCT_STATUSES, 'status') ?? 'active';
    const moq = body.moq === undefined || body.moq === null
      ? 1
      : requireInt(body.moq, 'minimum order quantity', { min: 1 });
    const stock = body.stockQuantity === undefined || body.stockQuantity === null
      ? 0
      : requireInt(body.stockQuantity, 'stock quantity', { min: 0 });
    const brand = optionalString(body.brand, 'brand', { max: 120 });
    const description = optionalString(body.description, 'description', { max: 2000 });
    const uom = optionalString(body.uom, 'unit of measure', { max: 32 });
    const imageUrl =
      body.imageUrl === undefined || body.imageUrl === null || String(body.imageUrl).trim() === ''
        ? undefined
        : httpUrl(body.imageUrl, 'image URL');
    const productCodeInput = optionalString(body.productCode, 'product code', {
      max: 64,
      pattern: SLUG_PATTERN,
      patternMsg: 'Product code has an invalid format.',
    });
    const skuInput = optionalString(body.sku, 'SKU', { max: 64 });

    // ── Resolve category ──────────────────────────────────────────
    const categoryName =
      categoryNameInput ||
      categorySlug.replace(/[_-]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
    const category = await getOrCreateCategory(categoryName, categorySlug, categoryDescription);

    if (!category) {
      logger.error('API', 'POST /admin/api/products — failed to resolve category', { slug: categorySlug });
      logger.api('POST', '/admin/api/products', 500, Date.now() - start);
      return NextResponse.json({ success: false, error: 'Failed to resolve category' }, { status: 500 });
    }

    // ── Prices (rupees → paise) ───────────────────────────────────
    const priceInPaise = Math.round(price * 100);
    const mrpInPaise   = mrpPrice !== undefined ? Math.round(mrpPrice * 100) : undefined;

    // product_code is the PK of every category table — must never be empty
    const productCode = productCodeInput || generateProductCode(categorySlug);

    // ── Insert into products table ────────────────────────────────
    const product = await createProduct(
      name,
      priceInPaise,
      description,
      category.id,
      {
        brand,
        uom,
        imageUrl,
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
    const sku     = skuInput || productCode;
    const variant = await createProductVariant(product.id, sku, stock, {}, undefined, mrpInPaise, moq);

    if (!variant) {
      logger.warn('Products', 'Variant creation failed, product was still created', { productId: product.id, sku });
    }

    // ── Insert into category-specific table (makes it visible in catalog/admin list) ──
    const catalogInserted = await insertProductIntoCategoryTable(categorySlug, {
      productCode,
      name,
      brand,
      description,
      price:       priceInPaise,
      mrpPrice:    mrpInPaise,
      moq,
      uom,
      imageUrl,
      status,
      variantId:   variant?.id,
      productsId:  product.id,
    });

    if (!catalogInserted) {
      logger.warn('Products', 'Category table insert failed; product exists in products table only', {
        productId: product.id,
        categorySlug,
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
    if (error instanceof ValidationError) {
      logger.warn('API', 'POST /admin/api/products — validation failed', { error: error.message });
      logger.api('POST', '/admin/api/products', 400, Date.now() - start);
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    logger.error('API', 'POST /admin/api/products — unhandled error', {
      error: error instanceof Error ? error.message : String(error),
    });
    logger.api('POST', '/admin/api/products', 500, Date.now() - start);
    return NextResponse.json({ success: false, error: 'Something went wrong on our end. Please try again in a few moments.' }, { status: 500 });
  }
}
