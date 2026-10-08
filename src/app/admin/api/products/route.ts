import {
  getOrCreateCategory,
  createProductWithCatalog,
  findProductConflicts,
  getProductsFromCategoryTables,
  getStockAlertCounts,
  saveProductTranslation,
  type StockFilter,
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

function isBlank(v: unknown): boolean {
  return v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
}

/** Parse a date/time value into an ISO timestamp string, or throw. */
function parseIsoDate(value: unknown, field: string): string {
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new ValidationError(`${field} must be a valid date/time.`);
  }
  const d = new Date(value);
  if (isNaN(d.getTime())) {
    throw new ValidationError(`${field} must be a valid date/time.`);
  }
  return d.toISOString();
}

// ── GET /admin/api/products ───────────────────────────────────────────────────
// Admin product list. Unlike the public /api/products it includes inactive and
// discontinued products, so they can still be found, edited and deleted.
// Query: ?category=&search=&page= (50 per page), &stock=out|low for stock alerts.
// The response also carries stockAlerts (counts) for the filter buttons.
const ADMIN_PRODUCTS_PAGE_SIZE = 50;

export async function GET(request: NextRequest) {
  const auth = await requireRole('admin');
  if ('response' in auth) return auth.response;
  const params = request.nextUrl.searchParams;
  const category = params.get('category') || undefined;
  const search = (params.get('search') || '').trim().slice(0, 100) || undefined;
  const stockParam = params.get('stock');
  const stockFilter: StockFilter | undefined = stockParam === 'out' || stockParam === 'low' ? stockParam : undefined;
  const pageParam = Number(params.get('page'));
  const page = Number.isInteger(pageParam) && pageParam > 1 ? pageParam : 1;
  const [{ products, total }, stockAlerts] = await Promise.all([
    getProductsFromCategoryTables({
      categorySlug: category,
      search,
      limit: ADMIN_PRODUCTS_PAGE_SIZE,
      offset: (page - 1) * ADMIN_PRODUCTS_PAGE_SIZE,
      includeInactive: true,
      stockFilter,
    }),
    getStockAlertCounts(),
  ]);
  return NextResponse.json(
    { success: true, data: { products, total, page, pageSize: ADMIN_PRODUCTS_PAGE_SIZE, stockAlerts } },
    { headers: { 'Cache-Control': 'no-store' } },
  );
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
    const size = optionalString(body.size, 'size', { max: 64 });
    const colour = optionalString(body.colour, 'colour', { max: 64 });
    const remarks = optionalString(body.remarks, 'remarks', { max: 500 });
    const imageUrl = isBlank(body.imageUrl) ? undefined : httpUrl(body.imageUrl, 'image URL');
    const productCodeInput = optionalString(body.productCode, 'product code', {
      max: 64,
      pattern: SLUG_PATTERN,
      patternMsg: 'Product code has an invalid format.',
    });
    const skuInput = optionalString(body.sku, 'SKU', { max: 64 });

    // ── Flash sale (optional; all three of price/start/end, or none) ──
    const salePrice = isBlank(body.salePrice) ? undefined : requireNumber(body.salePrice, 'sale price', { min: 0.01 });
    const saleStartsAt = isBlank(body.saleStartsAt) ? undefined : parseIsoDate(body.saleStartsAt, 'Sale start time');
    const saleEndsAt = isBlank(body.saleEndsAt) ? undefined : parseIsoDate(body.saleEndsAt, 'Sale end time');
    const anySale = salePrice !== undefined || saleStartsAt !== undefined || saleEndsAt !== undefined;
    const allSale = salePrice !== undefined && saleStartsAt !== undefined && saleEndsAt !== undefined;
    if (anySale && !allSale) {
      throw new ValidationError('To run a flash sale, set the sale price, start time, and end time together.');
    }
    if (allSale && new Date(saleEndsAt!) <= new Date(saleStartsAt!)) {
      throw new ValidationError('Sale end time must be after the start time.');
    }
    if (salePrice !== undefined && salePrice >= price) {
      throw new ValidationError('Sale price must be less than the regular selling price.');
    }
    const saleMinOrder = allSale && !isBlank(body.saleMinOrder)
      ? requireNumber(body.saleMinOrder, 'minimum order value', { min: 0.01 })
      : undefined;

    // ── Hindi (optional) ──────────────────────────────────────────
    const nameHi = isBlank(body.nameHi) ? null : requireString(body.nameHi, 'Hindi name', { max: 200 });
    const descriptionHi = nameHi && !isBlank(body.descriptionHi)
      ? requireString(body.descriptionHi, 'Hindi description', { max: 2000 })
      : null;

    // product_code is the PK of every category table - must never be empty
    const productCode = productCodeInput || generateProductCode(categorySlug);
    const sku = skuInput || productCode;

    // ── Reject duplicates up front (clear message instead of a DB error) ──
    const conflicts = await findProductConflicts(productCode, sku);
    if (conflicts.productCode || conflicts.sku) {
      const msg = conflicts.productCode
        ? `Product code "${productCode}" is already used by another product.`
        : `SKU "${sku}" is already used by another product.`;
      logger.api('POST', '/admin/api/products', 409, Date.now() - start);
      return NextResponse.json({ success: false, error: msg }, { status: 409 });
    }

    // ── Resolve category ──────────────────────────────────────────
    const categoryName =
      categoryNameInput ||
      categorySlug.replace(/[_-]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
    const category = await getOrCreateCategory(categoryName, categorySlug, categoryDescription);

    if (!category) {
      logger.error('API', 'POST /admin/api/products - failed to resolve category', { slug: categorySlug });
      logger.api('POST', '/admin/api/products', 500, Date.now() - start);
      return NextResponse.json({ success: false, error: 'Failed to resolve category' }, { status: 500 });
    }

    // ── Prices (rupees → paise) ───────────────────────────────────
    const toPaise = (rupees: number) => Math.round(rupees * 100);
    const priceInPaise = toPaise(price);

    // ── Insert product + variant + inventory + category row atomically ──
    const created = await createProductWithCatalog({
      productCode,
      sku,
      name,
      brand,
      description,
      price:        priceInPaise,
      mrpPrice:     mrpPrice !== undefined ? toPaise(mrpPrice) : undefined,
      moq,
      stock,
      uom,
      size,
      colour,
      remarks,
      imageUrl,
      status,
      categoryId:   category.id,
      categorySlug,
      salePrice:         salePrice !== undefined ? toPaise(salePrice) : undefined,
      saleStartsAt,
      saleEndsAt,
      saleMinOrderPaise: saleMinOrder !== undefined ? toPaise(saleMinOrder) : undefined,
    });

    if (!created) {
      logger.api('POST', '/admin/api/products', 500, Date.now() - start);
      return NextResponse.json(
        { success: false, error: 'Failed to create product. Nothing was saved - please try again.' },
        { status: 500 },
      );
    }

    // Translation lives in its own table; the product itself is already saved.
    let warning: string | undefined;
    if (nameHi) {
      const ok = await saveProductTranslation(productCode, 'hi', nameHi, descriptionHi, true);
      if (!ok) warning = 'Product created, but the Hindi translation could not be saved. Add it from the edit page.';
    }

    logger.info('Products', 'Product created via admin', { productId: created.productId, productCode, sku });
    logger.api('POST', '/admin/api/products', 201, Date.now() - start);

    return NextResponse.json(
      {
        success: true,
        warning,
        data: {
          id:         created.productId,
          productCode,
          name,
          categoryId: category.id,
          price:      priceInPaise,
          sku,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ValidationError) {
      logger.warn('API', 'POST /admin/api/products - validation failed', { error: error.message });
      logger.api('POST', '/admin/api/products', 400, Date.now() - start);
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    logger.error('API', 'POST /admin/api/products - unhandled error', {
      error: error instanceof Error ? error.message : String(error),
    });
    logger.api('POST', '/admin/api/products', 500, Date.now() - start);
    return NextResponse.json({ success: false, error: 'Something went wrong on our end. Please try again in a few moments.' }, { status: 500 });
  }
}
