import { neon } from '@neondatabase/serverless';
import { CategoryDB, CategoryId, Product, ProductDB, ProductVariant } from '@/types';
import { logger } from '@/lib/logger';

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

function categoryTableRowToProduct(row: any): Product {
  const priceVal = Number(row.price)     || 0;
  const mrpVal   = Number(row.mrp_price) || 0;
  const brand    = (row.brand as string) || '';
  const rawName  = (row.name  as string) || '';
  const productCode = (row.product_code as string);

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
    price:        Math.round(priceVal / 100),
    mrpPrice:     mrpVal > 0 ? Math.round(mrpVal / 100) : undefined,
    unit:         row.uom || 'piece',
    category:     (row.category_slug || 'carpentry') as CategoryId,
    imageUrl:     row.image_url || undefined,
    stockStatus:  'in_stock',
    sku:          productCode,
    variantId:    row.variant_id || undefined,
    moq:          Number(row.moq) || 1,
    variantCount: 1,
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

    const filterArgs: unknown[] = [];
    const whereClauses: string[] = ['TRUE'];

    // Search filter: name, brand, description
    if (search?.trim()) {
      const pat = `%${search.trim()}%`;
      filterArgs.push(pat, pat, pat);
      const n = filterArgs.length;
      whereClauses.push(
        `(name ILIKE $${n - 2} OR brand ILIKE $${n - 1} OR COALESCE(description,'') ILIKE $${n})`,
      );
    }

    // Price filter: category tables store price in paise (1 rupee = 100 paise)
    if (minPrice !== undefined && minPrice > 0) {
      filterArgs.push(minPrice * 100);
      whereClauses.push(`price >= $${filterArgs.length}`);
    }
    if (maxPrice !== undefined) {
      filterArgs.push(maxPrice * 100);
      whereClauses.push(`price <= $${filterArgs.length}`);
    }

    const whereStr   = whereClauses.join(' AND ');
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
      console.debug('[catalog] filters:', whereClauses);
    }

    const [rows, countRows] = await Promise.all([
      sqlClient.query(rowsQuery, rowsArgs as any[]),
      sqlClient.query(countQuery, countArgs as any[]),
    ]);

    const products = (rows as any[]).map(categoryTableRowToProduct);
    const total    = Number((countRows as any[])[0]?.total ?? 0);

    if (process.env.DEBUG_CATALOG === '1') {
      console.debug('[catalog] returned:', products.length, 'of total', total);
    }

    return { products, total };
  } catch (error) {
    logger.error('Products', 'getProductsFromCategoryTables failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return { products: [], total: 0 };
  }
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
    const PRODUCT_SELECT = `
      SELECT
        p.id                           AS db_id,
        COALESCE(p.product_code, p.id::text) AS product_code,
        p.name,
        COALESCE(p.brand,'')           AS brand,
        COALESCE(p.description,'')     AS description,
        p.price                        AS base_price_paise,
        COALESCE(p.image_url,'')       AS image_url,
        COALESCE(p.uom,'')             AS product_uom,
        COALESCE(c.slug,'')            AS category_slug
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
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
        COALESCE(pv.price_override, p.price) AS effective_price_paise,
        pv.mrp_price AS mrp_price_paise,
        COALESCE(pv.moq, 1) AS moq,
        COALESCE(pv.attributes, '{}') AS attributes,
        COALESCE(inv.stock_quantity, 0)    AS stock_quantity,
        COALESCE(inv.reserved_quantity, 0) AS reserved_quantity
      FROM product_variants pv
      JOIN products p ON p.id = pv.product_id
      LEFT JOIN inventory inv ON inv.variant_id = pv.id
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

    const firstVariant = variants[0];
    const attrs = firstVariant?.attributes ?? {};

    const prBrand      = (pr.brand as string) || '';
    const prRawName    = (pr.name  as string) || '';
    const prDisplayName = prBrand && prRawName.startsWith(prBrand + ' ')
      ? prRawName.slice(prBrand.length + 1)
      : prRawName;

    const productCode = (pr.product_code as string) || dbId;

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
      imageUrl:     pr.image_url || undefined,
      stockStatus:  'in_stock',
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
  stock_quantity: number;
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
  categoryId?: string
): Promise<ProductDB | null> {
  const sql = getClient();
  try {
    const result = await sql`
      INSERT INTO products (name, description, category_id, price, status)
      VALUES (${name}, ${description || null}, ${categoryId || null}, ${price}, 'active')
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
  priceOverride?: number
): Promise<ProductVariant | null> {
  const sql = getClient();
  try {
    const result = await sql`
      INSERT INTO product_variants (product_id, sku, stock_quantity, attributes, price_override)
      VALUES (${productId}, ${sku}, ${stockQuantity}, ${JSON.stringify(attributes)}, ${priceOverride || null})
      RETURNING *
    `;

    if (result.length === 0) return null;
    return dbVariantToVariant(result[0] as DbProductVariant);
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
    const result = await sql`
      UPDATE product_variants
      SET stock_quantity = ${quantity}
      WHERE id = ${variantId}
      RETURNING id
    `;

    return result.length > 0;
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
      SELECT id, stock_quantity FROM product_variants
      WHERE id = ANY(${variantIds})
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
    stockQuantity: dbVar.stock_quantity,
    attributes: dbVar.attributes,
    createdAt:
      dbVar.created_at instanceof Date
        ? dbVar.created_at.toISOString()
        : String(dbVar.created_at),
  };
}
