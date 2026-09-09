import { neon } from '@neondatabase/serverless';
import { CategoryDB, CategoryId, Product, ProductDB, ProductVariant } from '@/types';
import { logger } from '@/lib/logger';
import { rankByFuzzyMatch } from '@/lib/fuzzySearch';

// ── Shared catalogue query fragment ──────────────────────────────────────────

const CATALOG_SELECT = `
  SELECT
    p.id                           AS db_id,
    COALESCE(p.product_code, p.id::text) AS product_code,
    p.name,
    COALESCE(p.brand, '')          AS brand,
    COALESCE(p.description, '')    AS description,
    COALESCE(p.image_url, '')      AS image_url,
    COALESCE(p.uom, '')            AS product_uom,
    c.id                           AS category_id,
    COALESCE(c.name, '')           AS category_name,
    COALESCE(c.slug, '')           AS category_slug,
    pv.id                          AS variant_id,
    COALESCE(pv.sku, '')           AS sku,
    COALESCE(pv.price_override, p.price) AS effective_price_paise,
    pv.mrp_price                   AS mrp_price_paise,
    COALESCE(pv.moq, 1)            AS moq,
    COALESCE(pv.attributes, '{}')  AS attributes,
    COALESCE(inv.stock_quantity - inv.reserved_quantity, 0) AS available_stock,
    (SELECT COUNT(*) FROM product_variants pv2 WHERE pv2.product_id = p.id) AS variant_count
  FROM products p
  LEFT JOIN categories c ON p.category_id = c.id
  LEFT JOIN LATERAL (
    SELECT * FROM product_variants
    WHERE product_id = p.id
    ORDER BY created_at ASC
    LIMIT 1
  ) pv ON TRUE
  LEFT JOIN inventory inv ON inv.variant_id = pv.id
`;

// ── Row → Product mapper ──────────────────────────────────────────────────────

function catalogRowToProduct(row: any): Product {
  const effectivePaise = Number(row.effective_price_paise) || 0;
  const mrpPaise       = Number(row.mrp_price_paise)       || 0;
  const stock          = Number(row.available_stock)        || 0;
  const attrs          = typeof row.attributes === 'object' ? row.attributes : {};

  // Strip brand prefix from product name for cleaner display ("CenturyPly Plywood" → "Plywood")
  const brand       = row.brand as string || '';
  const rawName     = row.name  as string || '';
  const brandPrefix = brand ? brand + ' ' : '';
  const displayName = brand && rawName.startsWith(brandPrefix)
    ? rawName.slice(brandPrefix.length)
    : rawName;

  // Use product_code as the canonical id exposed to the frontend.
  // product_code is the stable SKU from the Google Sheet (e.g. "PLY-CP-04").
  // Falls back to the DB UUID for any legacy rows without a product_code.
  const productCode = (row.product_code as string) || (row.db_id as string);

  return {
    id:           productCode,
    productCode:  productCode,
    name:         displayName,
    brand:        brand || undefined,
    description:  row.description || '',
    price:        Math.round(effectivePaise / 100),
    mrpPrice:     mrpPaise > 0 ? Math.round(mrpPaise / 100) : undefined,
    unit:         attrs.uom || row.product_uom || 'piece',
    category:     (row.category_slug || 'carpentry') as CategoryId,
    imageUrl:     row.image_url || undefined,
    stockStatus:  stock > 10 ? 'in_stock' : stock > 0 ? 'low' : 'in_stock',
    sku:          row.sku || undefined,
    variantId:    row.variant_id || undefined,
    moq:          Number(row.moq) || 1,
    variantCount: Number(row.variant_count) || 1,
  };
}

// ── Public catalogue interfaces ───────────────────────────────────────────────

export interface CatalogParams {
  categorySlug?: string;
  search?:       string;
  limit?:        number;
  offset?:       number;
  minPrice?:     number; // in rupees (inclusive)
  maxPrice?:     number; // in rupees (inclusive)
}

export interface CatalogResult {
  products: Product[];
  total:    number;
}

/**
 * Fetch products with their primary variant + inventory in one query.
 * Supports optional category slug filter, free-text search, and pagination.
 */
export async function getProductCatalog(params: CatalogParams = {}): Promise<CatalogResult> {
  const sql = getUnpooledClient();
  const { categorySlug, search, limit = 500, offset = 0 } = params;

  try {
    const wheres: string[] = ["p.status = 'active'"];
    const args: unknown[]  = [];

    if (categorySlug) {
      args.push(categorySlug);
      wheres.push(`c.slug = $${args.length}`);
    }

    if (search && search.trim()) {
      const pat = `%${search.trim()}%`;
      args.push(pat, pat, pat);
      const n = args.length;
      wheres.push(`(p.name ILIKE $${n - 2} OR p.brand ILIKE $${n - 1} OR COALESCE(p.description,'') ILIKE $${n})`);
    }

    const whereClause = wheres.join(' AND ');

    // Count query
    args.push(limit, offset);
    const limitIdx  = args.length - 1;
    const offsetIdx = args.length;

    const rowsQuery = `
      ${CATALOG_SELECT}
      WHERE ${whereClause}
      ORDER BY c.name ASC, p.name ASC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `;

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE ${whereClause}
    `;

    // Run both in parallel; count uses only the filter args (not limit/offset)
    const filterArgs = args.slice(0, args.length - 2);
    const [rows, countRows] = await Promise.all([
      sql.query(rowsQuery, args as any[]),
      sql.query(countQuery, filterArgs as any[]),
    ]);

    const products = (rows as any[]).map(catalogRowToProduct);
    const total    = Number((countRows as any[])[0]?.total ?? 0);

    return { products, total };
  } catch (error) {
    logger.error('Products', 'getProductCatalog failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return { products: [], total: 0 };
  }
}

// ── Category-table constants ──────────────────────────────────────────────────

/** Maps every user-facing category slug to its DB table name. */
export const CATEGORY_SLUG_TO_TABLE: Record<string, string> = {
  'carpentry':           'carpentry',
  'paints_and_polish':   'paints_and_polish',
  'paints':              'paints_and_polish',
  'plumbing':            'plumbing',
  'civil_materials':     'civil_materials',
  'civil-materials':     'civil_materials',
  'electrical':          'electrical',
  'flooring_and_ceilings': 'flooring_and_ceilings',
  'flooring-ceilings':   'flooring_and_ceilings',
  'glass_and_aluminium': 'glass_and_aluminium',
  'glass-aluminium':     'glass_and_aluminium',
  'tools_and_machines':  'tools_and_machines',
  'tools-machines':      'tools_and_machines',
};

const VALID_CATEGORY_TABLES = new Set([
  'carpentry', 'paints_and_polish', 'plumbing', 'civil_materials',
  'electrical', 'flooring_and_ceilings', 'glass_and_aluminium', 'tools_and_machines',
  'products_catalog_view',
]);

// ── Category-table row → Product mapper ──────────────────────────────────────

/**
 * A row's flash sale is active when it has a sale_price and NOW() falls
 * inside [sale_starts_at, sale_ends_at]. Computed client-side (not trusted
 * for checkout — see the CASE expression in getTrustedUnitPrices) so it works
 * identically whether the row came from a category table or the view.
 */
function isSaleActive(row: any): boolean {
  if (row.sale_price == null || !row.sale_starts_at || !row.sale_ends_at) return false;
  const now = Date.now();
  return now >= new Date(row.sale_starts_at).getTime() && now <= new Date(row.sale_ends_at).getTime();
}

function categoryTableRowToProduct(row: any): Product {
  const priceVal   = Number(row.price)     || 0;
  const mrpVal     = Number(row.mrp_price) || 0;
  const brand      = (row.brand as string) || '';
  const rawName    = (row.name  as string) || '';
  const productCode = (row.product_code as string);
  const saleActive = isSaleActive(row);
  const effectivePriceVal = saleActive ? Number(row.sale_price) : priceVal;

  const displayName = brand && rawName.startsWith(brand + ' ')
    ? rawName.slice(brand.length + 1)
    : rawName;

  // Reconstruct attributes for variant size display
  const attrs: Record<string, string> = {};
  if (row.size)   attrs.size   = row.size;
  if (row.colour) attrs.colour = row.colour;
  if (row.uom)    attrs.uom    = row.uom;
  if (row.remarks) attrs.remarks = row.remarks;

  return {
    id:           productCode,
    productCode:  productCode,
    name:         displayName,
    brand:        brand || undefined,
    description:  row.description || '',
    price:        Math.round(effectivePriceVal / 100),
    mrpPrice:     mrpVal > 0 ? Math.round(mrpVal / 100) : undefined,
    unit:         row.uom || 'piece',
    category:     (row.category_slug || 'carpentry') as CategoryId,
    imageUrl:     row.image_url || undefined,
    stockStatus:  'in_stock',
    sku:          productCode,
    variantId:    row.variant_id || undefined,
    moq:          Number(row.moq) || 1,
    variantCount: 1,
    isFlashSale:  saleActive || undefined,
    saleEndsAt:   saleActive ? new Date(row.sale_ends_at).toISOString() : undefined,
    saleOriginalPriceRupees: saleActive ? Math.round(priceVal / 100) : undefined,
    saleMinOrderRupees: saleActive && row.sale_min_order_paise != null
      ? Math.round(Number(row.sale_min_order_paise) / 100)
      : undefined,
  };
}

/**
 * Fetch products directly from category tables / UNION view.
 * Uses the same CatalogParams interface as getProductCatalog.
 * Queries the specific category table when categorySlug is provided,
 * otherwise queries the products_catalog_view UNION for all categories.
 */
export async function getProductsFromCategoryTables(
  params: CatalogParams = {},
): Promise<CatalogResult> {
  const sqlClient = getUnpooledClient();
  const { categorySlug, search, limit = 500, offset = 0, minPrice, maxPrice } = params;

  try {
    // Resolve which table/view to query
    const tableName = categorySlug
      ? (CATEGORY_SLUG_TO_TABLE[categorySlug] ?? null)
      : 'products_catalog_view';

    if (!tableName || !VALID_CATEGORY_TABLES.has(tableName)) {
      // Unknown category slug — fall back to empty result (not an error)
      logger.warn('Products', `getProductsFromCategoryTables: unknown slug "${categorySlug}"`);
      return { products: [], total: 0 };
    }

    // Price filter (and optionally search) as WHERE args — split out so the
    // fuzzy fallback below can re-run price/category filters without the
    // exact-substring search clause.
    const buildFilters = (includeSearch: boolean) => {
      const args: unknown[] = [];
      const clauses: string[] = ['TRUE'];

      if (includeSearch && search?.trim()) {
        const pat = `%${search.trim()}%`;
        args.push(pat, pat, pat);
        const n = args.length;
        clauses.push(
          `(name ILIKE $${n - 2} OR brand ILIKE $${n - 1} OR COALESCE(description,'') ILIKE $${n})`,
        );
      }

      // Category tables store price in paise (1 rupee = 100 paise)
      if (minPrice !== undefined && minPrice > 0) {
        args.push(minPrice * 100);
        clauses.push(`price >= $${args.length}`);
      }
      if (maxPrice !== undefined) {
        args.push(maxPrice * 100);
        clauses.push(`price <= $${args.length}`);
      }

      return { where: clauses.join(' AND '), args };
    };

    const { where: whereStr, args: filterArgs } = buildFilters(true);
    const rowsArgs   = [...filterArgs, limit, offset];
    const countArgs  = [...filterArgs];
    const limitIdx   = rowsArgs.length - 1;
    const offsetIdx  = rowsArgs.length;
    const rowsQuery  = `SELECT * FROM ${tableName} WHERE ${whereStr} ORDER BY brand ASC, name ASC LIMIT $${limitIdx} OFFSET $${offsetIdx}`;
    const countQuery = `SELECT COUNT(*) AS total FROM ${tableName} WHERE ${whereStr}`;

    // Debug logging (set DEBUG_CATALOG=1 to enable)
    if (process.env.DEBUG_CATALOG === '1') {
      console.debug('[catalog] table:', tableName);
      console.debug('[catalog] query:', rowsQuery);
      console.debug('[catalog] args:', rowsArgs);
    }

    const [rows, countRows] = await Promise.all([
      sqlClient.query(rowsQuery, rowsArgs as any[]),
      sqlClient.query(countQuery, countArgs as any[]),
    ]);

    let products = (rows as any[]).map(categoryTableRowToProduct);
    let total    = Number((countRows as any[])[0]?.total ?? 0);

    // Exact substring search found nothing — the shopper likely mistyped the
    // product name. Re-scan the (category/price-scoped, search-unfiltered)
    // candidates with typo-tolerant matching instead of showing "no results".
    if (search?.trim() && total === 0 && offset === 0) {
      const { where: fallbackWhere, args: fallbackArgs } = buildFilters(false);
      const candidateRows = await sqlClient.query(
        `SELECT * FROM ${tableName} WHERE ${fallbackWhere}`,
        fallbackArgs as any[],
      ) as any[];
      const candidates = candidateRows.map(categoryTableRowToProduct);
      const fuzzyMatches = rankByFuzzyMatch(search, candidates, limit);

      if (fuzzyMatches.length > 0) {
        products = fuzzyMatches;
        total    = fuzzyMatches.length;
      }
    }

    if (process.env.DEBUG_CATALOG === '1') {
      console.debug('[catalog] returned:', products.length, 'of total', total);
    }

    // Batch-fetch stock quantities from product_variants for all products that
    // have a variant_id. One query, no N+1 problem.
    const variantIds = products.map(p => p.variantId).filter(Boolean) as string[];
    if (variantIds.length > 0) {
      try {
        const stockRows = await sqlClient.query(
          `SELECT pv.id, COALESCE(inv.stock_quantity - inv.reserved_quantity, 0) AS stock_quantity
           FROM product_variants pv
           LEFT JOIN inventory inv ON inv.variant_id = pv.id
           WHERE pv.id = ANY($1::uuid[])`,
          [variantIds] as any[],
        ) as any[];
        const stockMap = new Map(stockRows.map((r: any) => [r.id as string, Number(r.stock_quantity)]));
        products.forEach(p => {
          if (p.variantId) {
            const qty = stockMap.get(p.variantId) ?? 0;
            p.stockQuantity = qty;
            p.stockStatus   = qty > 10 ? 'in_stock' : qty > 0 ? 'low' : 'out';
          }
        });
      } catch {
        // Stock fetch failure is non-fatal; products still returned without quantity
      }
    }

    return { products, total };
  } catch (error) {
    logger.error('Products', 'getProductsFromCategoryTables failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return { products: [], total: 0 };
  }
}

export interface ActiveFlashSale {
  productCode: string;
  name: string;
  brand?: string;
  imageUrl?: string;
  salePriceRupees: number;
  originalPriceRupees: number;
  saleEndsAt: string; // ISO timestamp
  minOrderRupees?: number; // cart must reach this (at original prices) to unlock the sale price
}

/**
 * Fetch the flash sale ending soonest that is currently active (used to
 * drive the homepage promo banner). Returns null when nothing is running.
 */
export async function getActiveFlashSale(): Promise<ActiveFlashSale | null> {
  const sql = getUnpooledClient();
  try {
    const rows = await sql`
      SELECT product_code, name, brand, image_url, price, sale_price, sale_ends_at, sale_min_order_paise
      FROM products_catalog_view
      WHERE sale_price IS NOT NULL
        AND NOW() BETWEEN sale_starts_at AND sale_ends_at
      ORDER BY sale_ends_at ASC
      LIMIT 1
    `;
    if (rows.length === 0) return null;
    const r = rows[0] as any;
    const brand = (r.brand as string) || '';
    const rawName = (r.name as string) || '';
    const displayName = brand && rawName.startsWith(brand + ' ')
      ? rawName.slice(brand.length + 1)
      : rawName;
    return {
      productCode:          r.product_code,
      name:                 displayName,
      brand:                brand || undefined,
      imageUrl:             r.image_url || undefined,
      salePriceRupees:      Math.round(Number(r.sale_price) / 100),
      originalPriceRupees:  Math.round(Number(r.price) / 100),
      saleEndsAt:           new Date(r.sale_ends_at).toISOString(),
      minOrderRupees:       r.sale_min_order_paise != null ? Math.round(Number(r.sale_min_order_paise) / 100) : undefined,
    };
  } catch (error) {
    logger.error('Products', 'getActiveFlashSale failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/** Per-product trusted pricing breakdown returned by getTrustedPricingInfo. */
export interface TrustedPriceInfo {
  originalPaise: number;
  salePaise: number | null;
  saleActive: boolean;
  minOrderPaise: number | null;
}

/**
 * Trusted server-side price lookup for checkout (H1).
 *
 * Given the public product ids (product_code), returns the authoritative
 * original price, sale price (if any), whether the sale is currently active,
 * and the sale's minimum-order threshold — all straight from the catalog in
 * PAISE, never trust a client-supplied price. The caller (order-pricing.ts)
 * decides whether the sale price applies, since that depends on the whole
 * cart's pre-discount subtotal, not any single line.
 *
 * Reads from products_catalog_view (the same source as GET /api/products), with
 * a fallback to the normalised products table for any codes not found there
 * (e.g. when LEGACY_PRODUCTS_TABLE=1) — treated as having no active sale.
 * Codes missing from both are simply absent from the returned map, and the
 * caller must reject them.
 */
export async function getTrustedPricingInfo(
  productCodes: string[],
): Promise<Map<string, TrustedPriceInfo>> {
  const out = new Map<string, TrustedPriceInfo>();
  const codes = Array.from(new Set(productCodes.filter(Boolean)));
  if (codes.length === 0) return out;

  const sql = getUnpooledClient();
  try {
    const rows = (await sql.query(
      `SELECT product_code, price, sale_price, sale_min_order_paise,
              (sale_price IS NOT NULL AND NOW() BETWEEN sale_starts_at AND sale_ends_at) AS sale_active
         FROM products_catalog_view
        WHERE product_code = ANY($1::text[])`,
      [codes],
    )) as any[];
    for (const r of rows) {
      out.set(r.product_code as string, {
        originalPaise: Number(r.price),
        salePaise: r.sale_price != null ? Number(r.sale_price) : null,
        saleActive: Boolean(r.sale_active),
        minOrderPaise: r.sale_min_order_paise != null ? Number(r.sale_min_order_paise) : null,
      });
    }

    const missing = codes.filter((c) => !out.has(c));
    if (missing.length > 0) {
      const legacy = (await sql.query(
        `SELECT COALESCE(product_code, id::text) AS product_code, price
           FROM products
          WHERE COALESCE(product_code, id::text) = ANY($1::text[])`,
        [missing],
      )) as any[];
      for (const r of legacy) {
        const code = r.product_code as string;
        if (!out.has(code)) {
          out.set(code, { originalPaise: Number(r.price), salePaise: null, saleActive: false, minOrderPaise: null });
        }
      }
    }
  } catch (error) {
    logger.error('Products', 'getTrustedPricingInfo failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    // Return whatever we have; unmatched codes cause the caller to reject.
  }
  return out;
}

/**
 * Fetch a single product with ALL its variants and inventory data.
 */
export interface VariantWithStock {
  id:            string;
  sku:           string;
  attributes:    Record<string, string>;
  priceRupees:   number;
  mrpRupees?:    number;
  moq:           number;
  stockQuantity: number;
}

export interface ProductDetail extends Product {
  variants: VariantWithStock[];
}

/**
 * Lookup by product_code (the stable SKU from the sheet) OR by UUID.
 * product_code is tried first; falls back to UUID for backward compat.
 */
export async function getProductWithVariants(identifier: string): Promise<ProductDetail | null> {
  const sql = getUnpooledClient();
  try {
    // products_catalog_view holds the authoritative image_url from the
    // category-specific tables (background-removed Cloudinary URLs).
    // The products table image_url can be stale or absent, so we prefer
    // the catalog view's value and fall back to products.image_url.
    const PRODUCT_SELECT = `
      SELECT
        p.id                           AS db_id,
        COALESCE(p.product_code, p.id::text) AS product_code,
        p.name,
        COALESCE(p.brand,'')           AS brand,
        COALESCE(p.description,'')     AS description,
        p.price                        AS base_price_paise,
        COALESCE(cv.image_url, p.image_url, '') AS image_url,
        COALESCE(p.uom,'')             AS product_uom,
        COALESCE(c.slug,'')            AS category_slug,
        COALESCE(c.name,'')            AS category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN products_catalog_view cv
        ON cv.product_code = COALESCE(p.product_code, p.id::text)
    `;

    // Try product_code first, then UUID, so both URL formats work
    let productRows = await sql.query(
      `${PRODUCT_SELECT} WHERE p.product_code = $1 AND p.status = 'active' LIMIT 1`,
      [identifier],
    ) as any[];

    if (!productRows.length) {
      productRows = await sql.query(
        `${PRODUCT_SELECT} WHERE p.id::text = $1 AND p.status = 'active' LIMIT 1`,
        [identifier],
      ) as any[];
    }

    if (!productRows.length) return null;

    const pr       = productRows[0];
    const dbId     = pr.db_id as string;

    const variantRows = await sql`
      SELECT
        pv.id, pv.sku,
        CASE
          WHEN cv.sale_price IS NOT NULL AND NOW() BETWEEN cv.sale_starts_at AND cv.sale_ends_at
          THEN cv.sale_price
          ELSE COALESCE(pv.price_override, p.price)
        END AS effective_price_paise,
        COALESCE(pv.price_override, p.price) AS original_price_paise,
        pv.mrp_price AS mrp_price_paise,
        COALESCE(pv.moq, 1) AS moq,
        COALESCE(pv.attributes, '{}') AS attributes,
        COALESCE(inv.stock_quantity, 0)    AS stock_quantity,
        COALESCE(inv.reserved_quantity, 0) AS reserved_quantity,
        (cv.sale_price IS NOT NULL AND NOW() BETWEEN cv.sale_starts_at AND cv.sale_ends_at) AS is_flash_sale,
        cv.sale_ends_at,
        cv.sale_min_order_paise
      FROM product_variants pv
      JOIN products p ON p.id = pv.product_id
      LEFT JOIN inventory inv ON inv.variant_id = pv.id
      LEFT JOIN products_catalog_view cv ON cv.variant_id = pv.id
      WHERE pv.product_id = ${dbId}
      ORDER BY pv.created_at ASC
    `;

    const variants: VariantWithStock[] = (variantRows as any[]).map(v => ({
      id:            v.id,
      sku:           v.sku,
      attributes:    typeof v.attributes === 'object' ? v.attributes : {},
      priceRupees:   Math.round(Number(v.effective_price_paise) / 100),
      mrpRupees:     v.mrp_price_paise ? Math.round(Number(v.mrp_price_paise) / 100) : undefined,
      moq:           Number(v.moq) || 1,
      stockQuantity: Math.max(0, Number(v.stock_quantity) - Number(v.reserved_quantity)),
    }));

    const firstVariantRow = (variantRows as any[])[0];
    const saleActiveOnDetail = Boolean(firstVariantRow?.is_flash_sale);

    const firstVariant = variants[0];
    const attrs = firstVariant?.attributes ?? {};

    const prBrand      = (pr.brand as string) || '';
    const prRawName    = (pr.name  as string) || '';
    const prDisplayName = prBrand && prRawName.startsWith(prBrand + ' ')
      ? prRawName.slice(prBrand.length + 1)
      : prRawName;

    const productCode = (pr.product_code as string) || dbId;

    const totalStock = firstVariant?.stockQuantity ?? 0;
    const stockStatus = totalStock > 10 ? 'in_stock' : totalStock > 0 ? 'low' : 'out';

    const product: ProductDetail = {
      id:           productCode,
      productCode:  productCode,
      name:         prDisplayName,
      brand:        prBrand || undefined,
      description:  pr.description || '',
      price:        firstVariant?.priceRupees ?? Math.round(Number(pr.base_price_paise) / 100),
      mrpPrice:     firstVariant?.mrpRupees,
      unit:         attrs.uom || pr.product_uom || 'piece',
      category:     (pr.category_slug || 'carpentry') as CategoryId,
      categoryName: pr.category_name || undefined,
      imageUrl:     pr.image_url || undefined,
      stockStatus,
      isFlashSale:  saleActiveOnDetail || undefined,
      saleEndsAt:   saleActiveOnDetail ? new Date(firstVariantRow.sale_ends_at).toISOString() : undefined,
      saleOriginalPriceRupees: saleActiveOnDetail
        ? Math.round(Number(firstVariantRow.original_price_paise) / 100)
        : undefined,
      saleMinOrderRupees: saleActiveOnDetail && firstVariantRow.sale_min_order_paise != null
        ? Math.round(Number(firstVariantRow.sale_min_order_paise) / 100)
        : undefined,
      sku:          firstVariant?.sku,
      variantId:    firstVariant?.id,
      moq:          firstVariant?.moq ?? 1,
      variantCount: variants.length,
      variants,
    };

    return product;
  } catch (error) {
    logger.error('Products', 'getProductWithVariants failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Product catalog CRUD operations
 * Handles categories, products, and variants
 */

const databaseUrl = process.env.DATABASE_URL || process.env.fastget_DATABASE_URL;

function getClient() {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  return neon(databaseUrl);
}

function getUnpooledClient() {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  const unpooledUrl = databaseUrl.replace('-pooler', '');
  return neon(unpooledUrl);
}

/**
 * Database interface for raw category row
 */
export interface DbCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: Date;
}

/**
 * Database interface for raw product row
 */
export interface DbProduct {
  id: string;
  name: string;
  description: string | null;
  category_id: string | null;
  price: number;
  status: 'active' | 'inactive' | 'discontinued';
  created_at: Date;
  updated_at: Date;
}

/**
 * Database interface for raw variant row
 */
export interface DbProductVariant {
  id: string;
  product_id: string;
  sku: string;
  price_override: number | null;
  attributes: Record<string, string>;
  created_at: Date;
}

// ============================================================================
// Category Operations
// ============================================================================

/**
 * Create a new product category.
 */
export async function createCategory(
  name: string,
  slug: string,
  description?: string
): Promise<CategoryDB | null> {
  const sql = getClient();
  try {
    const result = await sql`
      INSERT INTO categories (name, slug, description)
      VALUES (${name}, ${slug}, ${description || null})
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
      RETURNING *
    `;

    if (result.length === 0) return null;
    return dbCategoryToCategory(result[0] as DbCategory);
  } catch (error) {
    logger.error('Products', 'Failed to create category', { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

/**
 * Get a category by slug, creating it if it doesn't exist.
 */
export async function getOrCreateCategory(
  name: string,
  slug: string,
  description?: string
): Promise<CategoryDB | null> {
  const existing = await getCategoryBySlug(slug);
  if (existing) return existing;
  return createCategory(name, slug, description);
}

/**
 * Get category by slug.
 */
export async function getCategoryBySlug(slug: string): Promise<CategoryDB | null> {
  const sql = getUnpooledClient();
  try {
    const result = await sql`
      SELECT * FROM categories WHERE slug = ${slug} LIMIT 1
    `;

    if (result.length === 0) return null;
    return dbCategoryToCategory(result[0] as DbCategory);
  } catch (error) {
    logger.error('Products', 'Failed to get category by slug', { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

/**
 * Get all categories.
 */
export async function getAllCategories(): Promise<CategoryDB[]> {
  const sql = getUnpooledClient();
  try {
    const result = await sql`
      SELECT * FROM categories ORDER BY created_at DESC
    `;

    return (result as DbCategory[]).map(dbCategoryToCategory);
  } catch (error) {
    logger.error('Products', 'Failed to get all categories', { error: error instanceof Error ? error.message : String(error) });
    return [];
  }
}

// ============================================================================
// Product Operations
// ============================================================================

/**
 * Create a new product.
 * Price should be in paise (1 rupee = 100 paise).
 */
export async function createProduct(
  name: string,
  price: number,
  description?: string,
  categoryId?: string,
  options?: {
    brand?: string;
    uom?: string;
    imageUrl?: string;
    productCode?: string;
    status?: 'active' | 'inactive' | 'discontinued';
  }
): Promise<ProductDB | null> {
  const sql = getClient();
  try {
    const status = options?.status ?? 'active';
    const result = await sql`
      INSERT INTO products (name, description, category_id, price, status, brand, uom, image_url, product_code)
      VALUES (
        ${name},
        ${description || null},
        ${categoryId || null},
        ${price},
        ${status},
        ${options?.brand || null},
        ${options?.uom || null},
        ${options?.imageUrl || null},
        ${options?.productCode || null}
      )
      RETURNING *
    `;

    if (result.length === 0) return null;
    return dbProductToProduct(result[0] as DbProduct);
  } catch (error) {
    logger.error('Products', 'Failed to create product', { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

/**
 * Get product by ID.
 */
export async function getProductById(productId: string): Promise<ProductDB | null> {
  const sql = getUnpooledClient();
  try {
    const result = await sql`
      SELECT * FROM products WHERE id = ${productId} LIMIT 1
    `;

    if (result.length === 0) return null;
    return dbProductToProduct(result[0] as DbProduct);
  } catch (error) {
    logger.error('Products', 'Failed to get product by ID', { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

/**
 * Get all active products (optionally filtered by category).
 */
export async function getActiveProducts(categoryId?: string): Promise<ProductDB[]> {
  const sql = getUnpooledClient();
  try {
    let result;
    if (categoryId) {
      result = await sql`
        SELECT * FROM products
        WHERE status = 'active' AND category_id = ${categoryId}
        ORDER BY created_at DESC
      `;
    } else {
      result = await sql`
        SELECT * FROM products
        WHERE status = 'active'
        ORDER BY created_at DESC
      `;
    }

    return (result as DbProduct[]).map(dbProductToProduct);
  } catch (error) {
    logger.error('Products', 'Failed to get active products', { error: error instanceof Error ? error.message : String(error) });
    return [];
  }
}

/**
 * Update product status (active, inactive, discontinued).
 */
export async function updateProductStatus(
  productId: string,
  status: 'active' | 'inactive' | 'discontinued'
): Promise<boolean> {
  const sql = getClient();
  try {
    const result = await sql`
      UPDATE products
      SET status = ${status}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${productId}
      RETURNING id
    `;

    return result.length > 0;
  } catch (error) {
    logger.error('Products', 'Failed to update product status', { error: error instanceof Error ? error.message : String(error) });
    return false;
  }
}

/**
 * Update product price.
 */
export async function updateProductPrice(
  productId: string,
  price: number
): Promise<boolean> {
  const sql = getClient();
  try {
    const result = await sql`
      UPDATE products
      SET price = ${price}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${productId}
      RETURNING id
    `;

    return result.length > 0;
  } catch (error) {
    logger.error('Products', 'Failed to update product price', { error: error instanceof Error ? error.message : String(error) });
    return false;
  }
}

// ============================================================================
// Product Variant Operations
// ============================================================================

/**
 * Create a new product variant with SKU.
 */
export async function createProductVariant(
  productId: string,
  sku: string,
  stockQuantity: number = 0,
  attributes: Record<string, string> = {},
  priceOverride?: number,
  mrpPrice?: number,
  moq: number = 1
): Promise<ProductVariant | null> {
  const sql = getClient();
  try {
    const result = await sql`
      INSERT INTO product_variants (product_id, sku, attributes, price_override, mrp_price, moq)
      VALUES (
        ${productId},
        ${sku},
        ${JSON.stringify(attributes)},
        ${priceOverride || null},
        ${mrpPrice || null},
        ${moq}
      )
      RETURNING *
    `;

    if (result.length === 0) return null;
    const variant = dbVariantToVariant(result[0] as DbProductVariant);

    // Seed inventory row for this variant
    await sql`
      INSERT INTO inventory (variant_id, stock_quantity, reserved_quantity)
      VALUES (${variant.id}, ${stockQuantity}, 0)
      ON CONFLICT (variant_id) DO NOTHING
    `;

    return variant;
  } catch (error) {
    logger.error('Products', 'Failed to create product variant', { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

/**
 * Get variant by SKU.
 */
export async function getVariantBySku(sku: string): Promise<ProductVariant | null> {
  const sql = getUnpooledClient();
  try {
    const result = await sql`
      SELECT * FROM product_variants WHERE sku = ${sku} LIMIT 1
    `;

    if (result.length === 0) return null;
    return dbVariantToVariant(result[0] as DbProductVariant);
  } catch (error) {
    logger.error('Products', 'Failed to get variant by SKU', { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

/**
 * Given a variant SKU (e.g. as stored on an order line item), resolve the
 * public product code used in product URLs (/product/[id],
 * /admin/products/[productCode]/edit). Falls back to the product's UUID for
 * legacy rows without a product_code. Returns null if the SKU has no
 * matching variant (e.g. discontinued or a legacy Google Sheets order).
 */
export async function getProductCodeByVariantSku(sku: string): Promise<string | null> {
  const sql = getUnpooledClient();
  try {
    const result = await sql`
      SELECT COALESCE(p.product_code, p.id::text) AS product_code
      FROM product_variants pv
      JOIN products p ON p.id = pv.product_id
      WHERE pv.sku = ${sku}
      LIMIT 1
    `;

    if (result.length === 0) return null;
    return (result[0] as { product_code: string }).product_code;
  } catch (error) {
    logger.error('Products', 'Failed to resolve product code by variant SKU', { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

/**
 * Get all variants for a product.
 */
export async function getProductVariants(productId: string): Promise<ProductVariant[]> {
  const sql = getUnpooledClient();
  try {
    const result = await sql`
      SELECT * FROM product_variants
      WHERE product_id = ${productId}
      ORDER BY created_at DESC
    `;

    return (result as DbProductVariant[]).map(dbVariantToVariant);
  } catch (error) {
    logger.error('Products', 'Failed to get product variants', { error: error instanceof Error ? error.message : String(error) });
    return [];
  }
}

/**
 * Update variant stock quantity.
 */
export async function updateVariantStock(
  variantId: string,
  quantity: number
): Promise<boolean> {
  const sql = getClient();
  try {
    await sql`
      INSERT INTO inventory (variant_id, stock_quantity, reserved_quantity)
      VALUES (${variantId}, ${quantity}, 0)
      ON CONFLICT (variant_id)
      DO UPDATE SET stock_quantity = ${quantity}, updated_at = NOW()
    `;
    return true;
  } catch (error) {
    logger.error('Products', 'Failed to update variant stock', { error: error instanceof Error ? error.message : String(error) });
    return false;
  }
}

/**
 * Update variant price override.
 */
export async function updateVariantPrice(
  variantId: string,
  priceOverride?: number
): Promise<boolean> {
  const sql = getClient();
  try {
    const result = await sql`
      UPDATE product_variants
      SET price_override = ${priceOverride || null}
      WHERE id = ${variantId}
      RETURNING id
    `;

    return result.length > 0;
  } catch (error) {
    logger.error('Products', 'Failed to update variant price', { error: error instanceof Error ? error.message : String(error) });
    return false;
  }
}

/**
 * Update price_override, mrp_price, and moq on a product variant in one call.
 * Only the fields present in `updates` are changed.
 */
export async function updateVariantFields(
  variantId: string,
  updates: {
    priceOverride?: number | null; // paise
    mrpPrice?:      number | null; // paise
    moq?:           number;
  },
): Promise<boolean> {
  const sql = getClient();
  try {
    const sets: string[]  = [];
    const vals: unknown[] = [];

    const push = (col: string, val: unknown) => { vals.push(val); sets.push(`${col} = $${vals.length}`); };

    if ('priceOverride' in updates) push('price_override', updates.priceOverride ?? null);
    if ('mrpPrice'      in updates) push('mrp_price',      updates.mrpPrice      ?? null);
    if (updates.moq     !== undefined) push('moq',         updates.moq);

    if (sets.length === 0) return true;

    vals.push(variantId);
    const result = await sql.query(
      `UPDATE product_variants SET ${sets.join(', ')} WHERE id = $${vals.length} RETURNING id`,
      vals as any[],
    ) as any[];
    return result.length > 0;
  } catch (error) {
    logger.error('Products', 'updateVariantFields failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

// ── Admin: raw row read/write ─────────────────────────────────────────────────

export interface RawProductRow {
  product_code: string;
  name: string;
  brand: string | null;
  description: string | null;
  price: number;          // paise
  mrp_price: number | null; // paise
  moq: number;
  uom: string | null;
  size: string | null;
  colour: string | null;
  image_url: string | null;
  status: string;
  category_slug: string | null;
  source_table: string;
  variant_id: string | null;
  products_id: string | null;
  sale_price: number | null;      // paise
  sale_starts_at: string | null;  // ISO timestamp
  sale_ends_at: string | null;    // ISO timestamp
  sale_min_order_paise: number | null;
}

/**
 * Fetch the raw catalog row for a product by product_code.
 * Uses products_catalog_view so source_table is included.
 */
export async function getProductRawRow(productCode: string): Promise<RawProductRow | null> {
  const sqlClient = getUnpooledClient();
  // Query category tables directly (not products_catalog_view) so admin can
  // load and edit inactive/discontinued products too.
  const cols = `product_code, name, brand, description, price, mrp_price, moq, uom,
                size, colour, image_url, status, category_slug, variant_id, products_id,
                sale_price, sale_starts_at, sale_ends_at, sale_min_order_paise`;
  const sub = (tbl: string) =>
    `SELECT ${cols}, '${tbl}' AS source_table FROM ${tbl} WHERE product_code = $1`;
  const query = [
    'carpentry', 'paints_and_polish', 'plumbing', 'civil_materials',
    'electrical', 'flooring_and_ceilings', 'glass_and_aluminium', 'tools_and_machines',
  ].map(sub).join('\nUNION ALL\n') + '\nLIMIT 1';
  try {
    const result = await sqlClient.query(query, [productCode]) as any[];
    return result.length > 0 ? (result[0] as RawProductRow) : null;
  } catch (error) {
    logger.error('Products', 'getProductRawRow failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Update a row in the appropriate category-specific table.
 * Only the fields provided in `updates` are changed.
 */
export async function updateProductInCategoryTable(
  tableName: string,
  productCode: string,
  updates: {
    name?: string;
    brand?: string | null;
    description?: string | null;
    price?: number;          // paise
    mrpPrice?: number | null; // paise
    moq?: number;
    uom?: string | null;
    imageUrl?: string | null;
    status?: string;
    salePrice?: number | null;     // paise
    saleStartsAt?: string | null;  // ISO timestamp
    saleEndsAt?: string | null;    // ISO timestamp
    saleMinOrderPaise?: number | null;
  },
): Promise<boolean> {
  if (!VALID_CATEGORY_TABLES.has(tableName) || tableName === 'products_catalog_view') {
    logger.warn('Products', `updateProductInCategoryTable: invalid table "${tableName}"`);
    return false;
  }
  const sqlClient = getUnpooledClient();
  try {
    const sets: string[]  = ['updated_at = NOW()'];
    const vals: unknown[] = [];

    const push = (col: string, val: unknown) => { vals.push(val); sets.push(`${col} = $${vals.length}`); };

    if (updates.name        !== undefined) push('name',       updates.name);
    if ('brand'       in updates)          push('brand',      updates.brand);
    if ('description' in updates)          push('description',updates.description);
    if (updates.price       !== undefined) push('price',      updates.price);
    if ('mrpPrice'    in updates)          push('mrp_price',  updates.mrpPrice);
    if (updates.moq         !== undefined) push('moq',        updates.moq);
    if ('uom'         in updates)          push('uom',        updates.uom);
    if ('imageUrl'    in updates)          push('image_url',  updates.imageUrl);
    if (updates.status      !== undefined) push('status',     updates.status);
    if ('salePrice'    in updates)         push('sale_price',      updates.salePrice);
    if ('saleStartsAt' in updates)         push('sale_starts_at',  updates.saleStartsAt);
    if ('saleEndsAt'   in updates)         push('sale_ends_at',    updates.saleEndsAt);
    if ('saleMinOrderPaise' in updates)    push('sale_min_order_paise', updates.saleMinOrderPaise);

    if (vals.length === 0) return true;

    vals.push(productCode);
    const q = `UPDATE ${tableName} SET ${sets.join(', ')} WHERE product_code = $${vals.length} RETURNING product_code`;
    const result = await sqlClient.query(q, vals as any[]) as any[];
    return result.length > 0;
  } catch (error) {
    logger.error('Products', `updateProductInCategoryTable "${tableName}" failed`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Update a product row in the normalised products table (for admin-created products).
 */
export async function updateNormalisedProduct(
  productId: string,
  updates: {
    name?: string;
    brand?: string | null;
    description?: string | null;
    price?: number;       // paise
    uom?: string | null;
    imageUrl?: string | null;
    status?: 'active' | 'inactive' | 'discontinued';
  },
): Promise<boolean> {
  const sql = getClient();
  try {
    const sets: string[]  = ['updated_at = CURRENT_TIMESTAMP'];
    const vals: unknown[] = [];

    const push = (col: string, val: unknown) => { vals.push(val); sets.push(`${col} = $${vals.length}`); };

    if (updates.name        !== undefined) push('name',        updates.name);
    if ('brand'       in updates)          push('brand',       updates.brand);
    if ('description' in updates)          push('description', updates.description);
    if (updates.price       !== undefined) push('price',       updates.price);
    if ('uom'         in updates)          push('uom',         updates.uom);
    if ('imageUrl'    in updates)          push('image_url',   updates.imageUrl);
    if (updates.status      !== undefined) push('status',      updates.status);

    if (vals.length === 0) return true;

    vals.push(productId);
    const result = await sql.query(
      `UPDATE products SET ${sets.join(', ')} WHERE id = $${vals.length} RETURNING id`,
      vals as any[],
    ) as any[];
    return result.length > 0;
  } catch (error) {
    logger.error('Products', 'updateNormalisedProduct failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Hard-delete a product and all associated data:
 * inventory row → product_variants row → category table row → products row.
 */
export async function deleteProductFromCategoryTable(
  tableName: string,
  productCode: string,
  variantId: string | null,
  productsId: string | null,
): Promise<boolean> {
  if (!VALID_CATEGORY_TABLES.has(tableName)) {
    logger.warn('Products', `deleteProductFromCategoryTable: invalid table "${tableName}"`);
    return false;
  }
  const sqlClient = getUnpooledClient();
  try {
    if (variantId) {
      await sqlClient.query('DELETE FROM inventory WHERE variant_id = $1', [variantId]);
    }
    await sqlClient.query(`DELETE FROM ${tableName} WHERE product_code = $1`, [productCode]);
    if (variantId) {
      await sqlClient.query('DELETE FROM product_variants WHERE id = $1', [variantId]);
    }
    if (productsId) {
      await sqlClient.query('DELETE FROM products WHERE id = $1', [productsId]);
    }
    return true;
  } catch (error) {
    logger.error('Products', `deleteProductFromCategoryTable "${tableName}" failed`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Upsert inventory stock for a variant.
 * Creates the inventory row if it doesn't exist yet.
 */
export async function upsertInventoryStock(
  variantId: string,
  stockQuantity: number,
): Promise<boolean> {
  const sql = getClient();
  try {
    await sql.query(
      `INSERT INTO inventory (variant_id, stock_quantity, reserved_quantity)
       VALUES ($1, $2, 0)
       ON CONFLICT (variant_id)
       DO UPDATE SET stock_quantity = $2, updated_at = NOW()`,
      [variantId, stockQuantity] as any[],
    );
    return true;
  } catch (error) {
    logger.error('Products', 'upsertInventoryStock failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Insert a product row into the appropriate category-specific table so it
 * appears in products_catalog_view and the admin product list.
 * All category tables share the same flat schema; nullable fields are optional.
 */
export async function insertProductIntoCategoryTable(
  categorySlug: string,
  data: {
    productCode: string;
    name: string;
    brand?: string;
    description?: string;
    price: number;       // paise
    mrpPrice?: number;   // paise
    moq?: number;
    uom?: string;
    imageUrl?: string;
    status?: string;
    variantId?: string;
    productsId?: string;
  }
): Promise<boolean> {
  const tableName = CATEGORY_SLUG_TO_TABLE[categorySlug] ?? null;
  if (!tableName || !VALID_CATEGORY_TABLES.has(tableName)) {
    logger.warn('Products', `insertProductIntoCategoryTable: unknown slug "${categorySlug}"`);
    return false;
  }

  const sqlClient = getUnpooledClient();
  try {
    const q = `
      INSERT INTO ${tableName}
        (product_code, name, brand, description, price, mrp_price, moq, uom,
         image_url, status, category_slug, variant_id, products_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      ON CONFLICT (product_code) DO NOTHING
    `;
    await sqlClient.query(q, [
      data.productCode,
      data.name,
      data.brand    ?? null,
      data.description ?? null,
      data.price,
      data.mrpPrice ?? null,
      data.moq      ?? 1,
      data.uom      ?? null,
      data.imageUrl ?? null,
      data.status   ?? 'active',
      categorySlug,
      data.variantId   ?? null,
      data.productsId  ?? null,
    ] as any[]);
    return true;
  } catch (error) {
    logger.error('Products', `Failed to insert into category table "${tableName}"`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Get effective price for a variant (override or product base price).
 */
export async function getEffectivePrice(variantId: string): Promise<number | null> {
  const sql = getUnpooledClient();
  try {
    const result = await sql`
      SELECT 
        COALESCE(pv.price_override, p.price) as effective_price
      FROM product_variants pv
      JOIN products p ON pv.product_id = p.id
      WHERE pv.id = ${variantId}
    `;

    if (result.length === 0) return null;
    return (result[0] as any).effective_price;
  } catch (error) {
    logger.error('Products', 'Failed to get effective price', { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

/**
 * Check stock availability for multiple variants.
 */
export async function checkStockAvailability(
  items: Array<{ variantId: string; quantity: number }>
): Promise<Map<string, boolean>> {
  const sql = getUnpooledClient();
  try {
    const variantIds = items.map((item) => item.variantId);
    const result = await sql`
      SELECT pv.id, COALESCE(inv.stock_quantity - inv.reserved_quantity, 0) AS stock_quantity
      FROM product_variants pv
      LEFT JOIN inventory inv ON inv.variant_id = pv.id
      WHERE pv.id = ANY(${variantIds})
    `;

    const availability = new Map<string, boolean>();
    const variantMap = new Map(result.map((r: any) => [r.id, r.stock_quantity]));

    for (const item of items) {
      const stock = variantMap.get(item.variantId) || 0;
      availability.set(item.variantId, stock >= item.quantity);
    }

    return availability;
  } catch (error) {
    logger.error('Products', 'Failed to check stock availability', { error: error instanceof Error ? error.message : String(error) });
    return new Map();
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function dbCategoryToCategory(dbCat: DbCategory): CategoryDB {
  return {
    id: dbCat.id,
    name: dbCat.name,
    slug: dbCat.slug,
    description: dbCat.description || undefined,
    createdAt:
      dbCat.created_at instanceof Date
        ? dbCat.created_at.toISOString()
        : String(dbCat.created_at),
  };
}

function dbProductToProduct(dbProd: DbProduct): ProductDB {
  return {
    id: dbProd.id,
    name: dbProd.name,
    description: dbProd.description || undefined,
    categoryId: dbProd.category_id || undefined,
    price: dbProd.price,
    status: dbProd.status,
    createdAt:
      dbProd.created_at instanceof Date
        ? dbProd.created_at.toISOString()
        : String(dbProd.created_at),
    updatedAt:
      dbProd.updated_at instanceof Date
        ? dbProd.updated_at.toISOString()
        : String(dbProd.updated_at),
  };
}

function dbVariantToVariant(dbVar: DbProductVariant): ProductVariant {
  return {
    id: dbVar.id,
    productId: dbVar.product_id,
    sku: dbVar.sku,
    priceOverride: dbVar.price_override || undefined,
    stockQuantity: 0,
    attributes: dbVar.attributes,
    createdAt:
      dbVar.created_at instanceof Date
        ? dbVar.created_at.toISOString()
        : String(dbVar.created_at),
  };
}
