import { NextRequest, NextResponse } from 'next/server';
import {
  getProductRawRow,
  updateProductInCategoryTable,
  updateNormalisedProduct,
  updateVariantFields,
  upsertInventoryStock,
  deleteProductFromCategoryTable,
} from '@/lib/products';
import { getUnpooledConnection } from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ productCode: string }> };

// ── GET /admin/api/products/[productCode] ─────────────────────────────────────
// Returns the raw row data needed to pre-fill the edit form.
export async function GET(_req: NextRequest, ctx: Ctx) {
  const { productCode } = await ctx.params;
  try {
    const row = await getProductRawRow(productCode);
    if (!row) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }
    // Fetch current stock from inventory (product_variants.stock_quantity doesn't exist in prod)
    let stockQuantity = 0;
    if (row.variant_id) {
      const sql = getUnpooledConnection();
      const invRows = await sql`
        SELECT COALESCE(inv.stock_quantity - inv.reserved_quantity, 0) AS stock_quantity
        FROM product_variants pv
        LEFT JOIN inventory inv ON inv.variant_id = pv.id
        WHERE pv.id = ${row.variant_id}
        LIMIT 1
      `;
      stockQuantity = Number((invRows[0] as any)?.stock_quantity ?? 0);
    }

    // Convert paise → rupees for the form
    return NextResponse.json({
      success: true,
      data: {
        productCode:   row.product_code,
        name:          row.name,
        brand:         row.brand        ?? '',
        description:   row.description  ?? '',
        price:         Math.round(row.price / 100),
        mrpPrice:      row.mrp_price ? Math.round(row.mrp_price / 100) : '',
        moq:           row.moq ?? 1,
        uom:           row.uom          ?? '',
        imageUrl:      row.image_url    ?? '',
        status:        row.status       ?? 'active',
        categorySlug:  row.category_slug ?? '',
        sourceTable:   row.source_table,
        productsId:    row.products_id  ?? null,
        stockQuantity,
      },
    });
  } catch (error) {
    logger.error('API', `GET /admin/api/products/${productCode} failed`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// ── PATCH /admin/api/products/[productCode] ───────────────────────────────────
// Updates the category table row and (if products_id present) the products table.
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { productCode } = await ctx.params;
  try {
    const body = await req.json();

    // Basic validation
    if (body.name !== undefined && (!body.name || !String(body.name).trim())) {
      return NextResponse.json({ success: false, error: 'Name cannot be empty' }, { status: 400 });
    }
    if (body.price !== undefined && (isNaN(Number(body.price)) || Number(body.price) <= 0)) {
      return NextResponse.json({ success: false, error: 'Price must be greater than 0' }, { status: 400 });
    }

    // Fetch current row to get source_table and products_id
    const row = await getProductRawRow(productCode);
    if (!row) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    // Build update payload for category table (prices in paise)
    const catUpdates: Parameters<typeof updateProductInCategoryTable>[2] = {};
    if (body.name        !== undefined) catUpdates.name        = String(body.name).trim();
    if ('brand'       in body)          catUpdates.brand        = body.brand       ? String(body.brand).trim()       : null;
    if ('description' in body)          catUpdates.description  = body.description ? String(body.description).trim() : null;
    if (body.price       !== undefined) catUpdates.price        = Math.round(Number(body.price) * 100);
    if ('mrpPrice'    in body)          catUpdates.mrpPrice     = body.mrpPrice    ? Math.round(Number(body.mrpPrice) * 100) : null;
    if (body.moq         !== undefined) catUpdates.moq          = Number(body.moq);
    if ('uom'         in body)          catUpdates.uom          = body.uom         ? String(body.uom).trim()         : null;
    if ('imageUrl'    in body)          catUpdates.imageUrl     = body.imageUrl    ? String(body.imageUrl).trim()    : null;
    if (body.status      !== undefined) catUpdates.status       = String(body.status);

    const catOk = await updateProductInCategoryTable(row.source_table, productCode, catUpdates);
    if (!catOk) {
      return NextResponse.json({ success: false, error: 'Failed to update product' }, { status: 500 });
    }

    // Also update normalised products table if linked
    if (row.products_id) {
      const normUpdates: Parameters<typeof updateNormalisedProduct>[1] = {};
      if (body.name        !== undefined) normUpdates.name        = String(body.name).trim();
      if ('brand'       in body)          normUpdates.brand        = body.brand       ? String(body.brand).trim()       : null;
      if ('description' in body)          normUpdates.description  = body.description ? String(body.description).trim() : null;
      if (body.price       !== undefined) normUpdates.price        = Math.round(Number(body.price) * 100);
      if ('uom'         in body)          normUpdates.uom          = body.uom         ? String(body.uom).trim()         : null;
      if ('imageUrl'    in body)          normUpdates.imageUrl     = body.imageUrl    ? String(body.imageUrl).trim()    : null;
      if (body.status      !== undefined) normUpdates.status       = body.status as 'active' | 'inactive' | 'discontinued';
      await updateNormalisedProduct(row.products_id, normUpdates);
    }

    // Update product_variants so the customer-facing product detail page reflects
    // the new price/mrp/moq immediately (it reads from price_override, not products.price).
    if (row.variant_id) {
      const varUpdates: Parameters<typeof updateVariantFields>[1] = {};
      if (body.price    !== undefined) varUpdates.priceOverride = Math.round(Number(body.price) * 100);
      if ('mrpPrice' in body)          varUpdates.mrpPrice      = body.mrpPrice ? Math.round(Number(body.mrpPrice) * 100) : null;
      if (body.moq      !== undefined) varUpdates.moq           = Number(body.moq);
      if (Object.keys(varUpdates).length > 0) {
        await updateVariantFields(row.variant_id, varUpdates);
      }

      // Update stock in inventory table (product_variants.stock_quantity doesn't exist in prod)
      if (body.stockQuantity !== undefined) {
        const qty = Math.max(0, Math.round(Number(body.stockQuantity)));
        await upsertInventoryStock(row.variant_id, qty);
      }
    }

    logger.info('API', `PATCH /admin/api/products/${productCode} — updated`);
    return NextResponse.json({ success: true, productCode });
  } catch (error) {
    logger.error('API', `PATCH /admin/api/products/${productCode} failed`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// ── DELETE /admin/api/products/[productCode] ──────────────────────────────────
// Hard-deletes the product from its category table, product_variants, inventory,
// and (if linked) the normalised products table.
export async function DELETE(_req: NextRequest, ctx: Ctx) {
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

    logger.info('API', `DELETE /admin/api/products/${productCode} — deleted`);
    return NextResponse.json({ success: true, productCode });
  } catch (error) {
    logger.error('API', `DELETE /admin/api/products/${productCode} failed`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
