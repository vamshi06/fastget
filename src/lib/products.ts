import { neon } from '@neondatabase/serverless';
import { CategoryDB, ProductDB, ProductVariant } from '@/types';
import { logger } from '@/lib/logger';

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
