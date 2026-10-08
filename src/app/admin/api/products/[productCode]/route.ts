import { NextRequest, NextResponse } from 'next/server';
import {
  getProductRawRow,
  updateProductInCategoryTable,
  updateNormalisedProduct,
  updateVariantFields,
  upsertInventoryStock,
  deleteProductFromCategoryTable,
  getProductTranslation,
  saveProductTranslation,
  getAllCategories,
  getCategoryBySlug,
  moveProductToCategory,
  CATEGORY_SLUG_TO_TABLE,
} from '@/lib/products';
import { getUnpooledConnection } from '@/lib/db';
import { logger } from '@/lib/logger';
import { requireRole } from '@/lib/auth';
import {
  ValidationError,
  requireString,
  requireNumber,
  requireInt,
  requireEnum,
  httpUrl,
} from '@/lib/validation';

export const dynamic = 'force-dynamic';

const PRODUCT_STATUSES = ['active', 'inactive', 'discontinued'] as const;

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

/** Paise → rupees without rounding (₹12.50 stays 12.5, not 13). */
function paiseToRupees(paise: number | string): number {
  return Number(paise) / 100;
}

type Ctx = { params: Promise<{ productCode: string }> };

// ── GET /admin/api/products/[productCode] ─────────────────────────────────────
// Returns the raw row data needed to pre-fill the edit form.
export async function GET(_req: NextRequest, ctx: Ctx) {
  const auth = await requireRole('admin');
  if ('response' in auth) return auth.response;
  const { productCode } = await ctx.params;
  try {
    const row = await getProductRawRow(productCode);
    if (!row) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }
    // Fetch current stock from inventory (product_variants.stock_quantity doesn't exist in prod).
    // Return the raw stock_quantity (not stock - reserved): PATCH writes this value
    // straight back to inventory.stock_quantity, so showing the net figure would
    // shrink stock by the reserved amount on every save.
    let stockQuantity = 0;
    let reservedQuantity = 0;
    // Specifications shown on the product page come from product_variants.attributes
    let attributes: Record<string, string> = {};
    if (row.variant_id) {
      const sql = getUnpooledConnection();
      const invRows = await sql`
        SELECT COALESCE(inv.stock_quantity, 0)    AS stock_quantity,
               COALESCE(inv.reserved_quantity, 0) AS reserved_quantity,
               COALESCE(pv.attributes, '{}') AS attributes
        FROM product_variants pv
        LEFT JOIN inventory inv ON inv.variant_id = pv.id
        WHERE pv.id = ${row.variant_id}
        LIMIT 1
      `;
      const invRow = invRows[0] as any;
      stockQuantity = Number(invRow?.stock_quantity ?? 0);
      reservedQuantity = Number(invRow?.reserved_quantity ?? 0);
      if (invRow && typeof invRow.attributes === 'object') attributes = invRow.attributes;
    }
    const [hindi, allCategories] = await Promise.all([
      getProductTranslation(productCode, 'hi'),
      getAllCategories(),
    ]);
    // Categories the product can be moved to (one per category table), plus the
    // one it currently lives in - matched by table since row.category_slug may be
    // a legacy sub-category slug.
    const categoryOptions = allCategories
      .filter((c) => CATEGORY_SLUG_TO_TABLE[c.slug])
      .map((c) => ({ slug: c.slug, name: c.name }));
    const currentCategory =
      categoryOptions.find((c) => CATEGORY_SLUG_TO_TABLE[c.slug] === row.source_table)?.slug ?? '';

    // Convert paise → rupees for the form. Never round: the form sends every
    // field back on save, so rounding here would silently change the stored price.
    return NextResponse.json({
      success: true,
      data: {
        productCode:   row.product_code,
        name:          row.name,
        brand:         row.brand        ?? '',
        description:   row.description  ?? '',
        price:         paiseToRupees(row.price),
        mrpPrice:      row.mrp_price ? paiseToRupees(row.mrp_price) : '',
        moq:           row.moq ?? 1,
        uom:           attributes.uom     ?? row.uom    ?? '',
        size:          attributes.size    ?? row.size   ?? '',
        colour:        attributes.colour  ?? row.colour ?? '',
        remarks:       attributes.remarks ?? '',
        imageUrl:     row.image_url    ?? '',
        status:        row.status       ?? 'active',
        categorySlug:  row.category_slug ?? '',
        currentCategory,
        categoryOptions,
        sourceTable:   row.source_table,
        productsId:    row.products_id  ?? null,
        stockQuantity,
        reservedQuantity,
        salePrice:     row.sale_price ? paiseToRupees(row.sale_price) : '',
        saleStartsAt:  row.sale_starts_at ?? '',
        saleEndsAt:    row.sale_ends_at   ?? '',
        saleMinOrder:  row.sale_min_order_paise ? paiseToRupees(row.sale_min_order_paise) : '',
        nameHi:        hindi?.name        ?? '',
        descriptionHi: hindi?.description ?? '',
        hiReviewed:    hindi?.reviewed    ?? false,
      },
    });
  } catch (error) {
    logger.error('API', `GET /admin/api/products/${productCode} failed`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ success: false, error: 'Something went wrong on our end. Please try again in a few moments.' }, { status: 500 });
  }
}

// ── PATCH /admin/api/products/[productCode] ───────────────────────────────────
// Updates the category table row and (if products_id present) the products table.
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const auth = await requireRole('admin');
  if ('response' in auth) return auth.response;
  const { productCode } = await ctx.params;
  try {
    const body = await req.json();

    // ── Validate provided fields (partial update - only what's present) ──
    const name = body.name !== undefined ? requireString(body.name, 'name', { max: 200 }) : undefined;
    const price = body.price !== undefined ? requireNumber(body.price, 'price', { min: 0.01 }) : undefined;
    const moq = body.moq !== undefined ? requireInt(body.moq, 'minimum order quantity', { min: 1 }) : undefined;
    const stock = body.stockQuantity !== undefined
      ? requireInt(body.stockQuantity, 'stock quantity', { min: 0 })
      : undefined;
    const status = body.status !== undefined ? requireEnum(body.status, PRODUCT_STATUSES, 'status') : undefined;

    // Fields that support clearing: present-but-blank → null, present-with-value → validated.
    const brandProvided = 'brand' in body;
    const brand = brandProvided ? (isBlank(body.brand) ? null : requireString(body.brand, 'brand', { max: 120 })) : undefined;
    const descProvided = 'description' in body;
    const description = descProvided ? (isBlank(body.description) ? null : requireString(body.description, 'description', { max: 2000 })) : undefined;
    const uomProvided = 'uom' in body;
    const uom = uomProvided ? (isBlank(body.uom) ? null : requireString(body.uom, 'unit of measure', { max: 32 })) : undefined;
    const sizeProvided = 'size' in body;
    const size = sizeProvided ? (isBlank(body.size) ? null : requireString(body.size, 'size', { max: 64 })) : undefined;
    const colourProvided = 'colour' in body;
    const colour = colourProvided ? (isBlank(body.colour) ? null : requireString(body.colour, 'colour', { max: 64 })) : undefined;
    const remarksProvided = 'remarks' in body;
    const remarks = remarksProvided ? (isBlank(body.remarks) ? null : requireString(body.remarks, 'remarks', { max: 500 })) : undefined;
    const imageUrlProvided = 'imageUrl' in body;
    const imageUrl = imageUrlProvided ? (isBlank(body.imageUrl) ? null : httpUrl(body.imageUrl, 'image URL')) : undefined;
    const mrpProvided = 'mrpPrice' in body;
    const mrp = mrpProvided ? (isBlank(body.mrpPrice) ? undefined : requireNumber(body.mrpPrice, 'MRP', { min: 0 })) : undefined;

    // Moving to another category (optional). Only a slug that maps to a category table is accepted.
    const newCategorySlug = isBlank(body.categorySlug)
      ? undefined
      : requireString(body.categorySlug, 'category', { max: 80 });
    if (newCategorySlug !== undefined && !CATEGORY_SLUG_TO_TABLE[newCategorySlug]) {
      throw new ValidationError('Unknown category.');
    }

    const priceInPaise = price !== undefined ? Math.round(price * 100) : undefined;
    const mrpInPaise = mrpProvided ? (mrp !== undefined ? Math.round(mrp * 100) : null) : undefined;

    // Flash sale fields - support clearing (blank -> null cancels the sale).
    const salePriceProvided = 'salePrice' in body;
    const salePrice = salePriceProvided
      ? (isBlank(body.salePrice) ? null : requireNumber(body.salePrice, 'sale price', { min: 0.01 }))
      : undefined;
    const saleStartsAtProvided = 'saleStartsAt' in body;
    const saleStartsAt = saleStartsAtProvided
      ? (isBlank(body.saleStartsAt) ? null : parseIsoDate(body.saleStartsAt, 'Sale start time'))
      : undefined;
    const saleEndsAtProvided = 'saleEndsAt' in body;
    const saleEndsAt = saleEndsAtProvided
      ? (isBlank(body.saleEndsAt) ? null : parseIsoDate(body.saleEndsAt, 'Sale end time'))
      : undefined;
    const salePriceInPaise = salePriceProvided
      ? (salePrice != null ? Math.round(salePrice * 100) : null)
      : undefined;
    const saleMinOrderProvided = 'saleMinOrder' in body;
    const saleMinOrder = saleMinOrderProvided
      ? (isBlank(body.saleMinOrder) ? null : requireNumber(body.saleMinOrder, 'minimum order value', { min: 0.01 }))
      : undefined;
    const saleMinOrderInPaise = saleMinOrderProvided
      ? (saleMinOrder != null ? Math.round(saleMinOrder * 100) : null)
      : undefined;

    // Hindi translation - only sent when the admin touched it, so a price-only
    // edit doesn't mark an unchecked machine translation as reviewed.
    // Blank name removes the translation (falls back to English).
    const hindiProvided = typeof body.hindi === 'object' && body.hindi !== null;
    const nameHi = hindiProvided && !isBlank(body.hindi.name)
      ? requireString(body.hindi.name, 'Hindi name', { max: 200 })
      : null;
    const descriptionHi = hindiProvided && !isBlank(body.hindi.description)
      ? requireString(body.hindi.description, 'Hindi description', { max: 2000 })
      : null;
    const hiReviewed = hindiProvided && body.hindi.reviewed === true;

    // Fetch current row to get source_table and products_id
    const row = await getProductRawRow(productCode);
    if (!row) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    // Compare against the stored value for whichever of price/MRP isn't being changed.
    const finalPrice = priceInPaise !== undefined ? priceInPaise : Number(row.price);
    const finalMrp   = mrpProvided ? mrpInPaise : (row.mrp_price != null ? Number(row.mrp_price) : null);
    if (finalMrp != null && finalMrp < finalPrice) {
      throw new ValidationError('MRP must be greater than or equal to price.');
    }

    const moveCategory = newCategorySlug !== undefined
      && CATEGORY_SLUG_TO_TABLE[newCategorySlug] !== row.source_table;
    const targetCategory = moveCategory ? await getCategoryBySlug(newCategorySlug!) : null;
    if (moveCategory && !targetCategory) {
      throw new ValidationError('Unknown category.');
    }

    // A flash sale needs price + start + end together - either newly submitted
    // or already stored on the row. Clearing all three cancels the sale.
    const finalSalePrice     = salePriceProvided     ? salePriceInPaise : row.sale_price;
    const finalSaleStartsAt  = saleStartsAtProvided  ? saleStartsAt     : row.sale_starts_at;
    const finalSaleEndsAt    = saleEndsAtProvided    ? saleEndsAt       : row.sale_ends_at;
    const anySaleField = finalSalePrice != null || finalSaleStartsAt != null || finalSaleEndsAt != null;
    const allSaleFields = finalSalePrice != null && finalSaleStartsAt != null && finalSaleEndsAt != null;
    if (anySaleField && !allSaleFields) {
      throw new ValidationError('To run a flash sale, set the sale price, start time, and end time together (or clear all three to cancel it).');
    }
    if (finalSaleStartsAt && finalSaleEndsAt && new Date(finalSaleEndsAt) <= new Date(finalSaleStartsAt)) {
      throw new ValidationError('Sale end time must be after the start time.');
    }
    const referencePriceInPaise = priceInPaise !== undefined ? priceInPaise : row.price;
    if (finalSalePrice != null && finalSalePrice >= referencePriceInPaise) {
      throw new ValidationError('Sale price must be less than the regular selling price.');
    }

    // Minimum order value only makes sense alongside an active/scheduled sale -
    // clear it automatically when the sale itself is being cancelled.
    const effectiveSaleMinOrderInPaise = !allSaleFields
      ? null
      : (saleMinOrderProvided ? saleMinOrderInPaise : undefined);

    // Build update payload for category table (prices in paise)
    const catUpdates: Parameters<typeof updateProductInCategoryTable>[2] = {};
    if (name !== undefined) catUpdates.name = name;
    if (brandProvided) catUpdates.brand = brand;
    if (descProvided) catUpdates.description = description;
    if (priceInPaise !== undefined) catUpdates.price = priceInPaise;
    if (mrpProvided) catUpdates.mrpPrice = mrpInPaise;
    if (moq !== undefined) catUpdates.moq = moq;
    if (uomProvided) catUpdates.uom = uom;
    if (sizeProvided) catUpdates.size = size;
    if (colourProvided) catUpdates.colour = colour;
    if (remarksProvided) catUpdates.remarks = remarks;
    if (imageUrlProvided) catUpdates.imageUrl = imageUrl;
    if (status !== undefined) catUpdates.status = status;
    if (salePriceProvided) catUpdates.salePrice = salePriceInPaise;
    if (saleStartsAtProvided) catUpdates.saleStartsAt = saleStartsAt;
    if (saleEndsAtProvided) catUpdates.saleEndsAt = saleEndsAt;
    if (effectiveSaleMinOrderInPaise !== undefined) catUpdates.saleMinOrderPaise = effectiveSaleMinOrderInPaise;

    const catOk = await updateProductInCategoryTable(row.source_table, productCode, catUpdates);
    if (!catOk) {
      return NextResponse.json({ success: false, error: 'Failed to update product' }, { status: 500 });
    }

    // The catalog row is saved; the writes below keep the other tables in sync.
    // Collect any that fail so the admin isn't told "Saved" while the product
    // page still shows old values.
    const failed: string[] = [];

    // Also update normalised products table if linked
    if (row.products_id) {
      const normUpdates: Parameters<typeof updateNormalisedProduct>[1] = {};
      if (name !== undefined) normUpdates.name = name;
      if (brandProvided) normUpdates.brand = brand;
      if (descProvided) normUpdates.description = description;
      if (priceInPaise !== undefined) normUpdates.price = priceInPaise;
      if (uomProvided) normUpdates.uom = uom;
      if (imageUrlProvided) normUpdates.imageUrl = imageUrl;
      if (status !== undefined) normUpdates.status = status;
      if (!(await updateNormalisedProduct(row.products_id, normUpdates))) failed.push('product details');
    }

    // Update product_variants so the customer-facing product detail page reflects
    // the new price/mrp/moq immediately (it reads from price_override, not products.price).
    // Its Specifications section reads product_variants.attributes, so sync those too.
    if (row.variant_id) {
      const varUpdates: Parameters<typeof updateVariantFields>[1] = {};
      if (priceInPaise !== undefined) varUpdates.priceOverride = priceInPaise;
      if (mrpProvided) varUpdates.mrpPrice = mrpInPaise;
      if (moq !== undefined) varUpdates.moq = moq;
      const attrUpdates: Record<string, string | null> = {};
      if (uomProvided) attrUpdates.uom = uom ?? null;
      if (sizeProvided) attrUpdates.size = size ?? null;
      if (colourProvided) attrUpdates.colour = colour ?? null;
      if (remarksProvided) attrUpdates.remarks = remarks ?? null;
      if (Object.keys(attrUpdates).length > 0) varUpdates.attributes = attrUpdates;
      if (Object.keys(varUpdates).length > 0) {
        if (!(await updateVariantFields(row.variant_id, varUpdates))) failed.push('price/MOQ/specifications');
      }

      // Update stock in inventory table (product_variants.stock_quantity doesn't exist in prod)
      if (stock !== undefined) {
        if (!(await upsertInventoryStock(row.variant_id, stock))) failed.push('stock');
      }
    }

    if (hindiProvided) {
      const ok = await saveProductTranslation(productCode, 'hi', nameHi, descriptionHi, hiReviewed);
      if (!ok) failed.push('Hindi translation');
    }

    // Move last, after every update above has targeted the current table.
    if (moveCategory && targetCategory) {
      const moved = await moveProductToCategory(
        row.source_table, productCode, newCategorySlug!, targetCategory.id, row.products_id ?? null,
      );
      if (!moved) failed.push('category change');
    }

    if (failed.length > 0) {
      logger.error('API', `PATCH /admin/api/products/${productCode} - partial save`, { failed });
      return NextResponse.json(
        {
          success: false,
          error: `Some changes were saved, but these could not be: ${failed.join(', ')}. Please try saving again.`,
        },
        { status: 500 },
      );
    }

    logger.info('API', `PATCH /admin/api/products/${productCode} - updated`);
    return NextResponse.json({ success: true, productCode });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    logger.error('API', `PATCH /admin/api/products/${productCode} failed`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ success: false, error: 'Something went wrong on our end. Please try again in a few moments.' }, { status: 500 });
  }
}

// ── DELETE /admin/api/products/[productCode] ──────────────────────────────────
// Hard-deletes the product from its category table, product_variants, inventory,
// and (if linked) the normalised products table.
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const auth = await requireRole('admin');
  if ('response' in auth) return auth.response;
  const { productCode } = await ctx.params;
  try {
    const row = await getProductRawRow(productCode);
    if (!row) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    const ok = await deleteProductFromCategoryTable(
      row.source_table,
      productCode,
      row.variant_id ?? null,
      row.products_id ?? null,
    );

    if (!ok) {
      return NextResponse.json({ success: false, error: 'Failed to delete product' }, { status: 500 });
    }

    logger.info('API', `DELETE /admin/api/products/${productCode} - deleted`);
    return NextResponse.json({ success: true, productCode });
  } catch (error) {
    logger.error('API', `DELETE /admin/api/products/${productCode} failed`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ success: false, error: 'Something went wrong on our end. Please try again in a few moments.' }, { status: 500 });
  }
}
