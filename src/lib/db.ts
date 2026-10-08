import { neon, neonConfig } from '@neondatabase/serverless';
import { Order, OrderItem, OrderStatus, PaymentMethod, VALID_STATUS_TRANSITIONS, CartItem, CoinTransaction, CoinTransactionReason } from '@/types';
import { logger } from '@/lib/logger';
import { REVIEW_EDIT_WINDOW_MINUTES } from '@/lib/reviewPolicy';

export { REVIEW_EDIT_WINDOW_MINUTES };

// The Neon HTTP driver posts every query to the same `/sql` URL, varying only
// in the request body. Next.js's fetch Data Cache doesn't key on POST bodies,
// so without this override it can serve a stale response from an earlier,
// different query - silently returning wrong data from a fresh-looking call.
neonConfig.fetchFunction = (url: string, options: RequestInit) =>
  fetch(url, { ...options, cache: 'no-store' });

/**
 * Neon Postgres database client and order CRUD operations
 *
 * Environment:
 * - DATABASE_URL or fastget_DATABASE_URL: Neon connection string (required)
 *
 * @module lib/db
 */

// Support both plain DATABASE_URL and Vercel-prefixed version (fastget_DATABASE_URL)
const databaseUrl = process.env.DATABASE_URL || process.env.fastget_DATABASE_URL;

// Lazy-initialise clients so that a missing env var does NOT crash the entire
// Next.js build/cold-start.  Each exported function will throw on first call
// if the URL is still absent, which is the correct behaviour for an API route.
function getClient() {
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL environment variable is required but not set ' +
        '(checked DATABASE_URL, fastget_DATABASE_URL)'
    );
  }
  return neon(databaseUrl);
}

function getUnpooledClient() {
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL environment variable is required but not set ' +
        '(checked DATABASE_URL, fastget_DATABASE_URL)'
    );
  }
  // Remove the PgBouncer pooler suffix so we hit the primary directly
  const unpooledUrl = databaseUrl.replace('-pooler', '');
  return neon(unpooledUrl);
}

/**
 * Helper – returns an unpooled sql client (direct primary access).
 * Exported for use in route handlers that need fresh reads.
 */
export function getUnpooledConnection() {
  return getUnpooledClient();
}

/**
 * Database row format for orders.
 * Matches Neon Postgres table structure with snake_case columns.
 * @internal
 */
export interface DbOrder {
  id: string;
  created_at: Date;
  customer_name: string;
  customer_phone: string;
  site_address: string;
  landmark: string | null;
  delivery_type: 'urgent' | 'scheduled';
  scheduled_time: Date | null;
  items: OrderItem[];
  subtotal: number;
  convenience_fee: number;
  discount: number;
  total: number;
  payment_method: string;
  status: OrderStatus;
  eta: string | null;
  status_token: string;
  update_token: string;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  razorpay_signature: string | null;
  payment_status: string | null;
  payment_captured_at: Date | null;
  user_id: string | null;
  status_history: { status: OrderStatus; timestamp: string }[] | null;
  // Referral program (migration 022)
  referral_code: string | null;
  referrer_user_id: string | null;
  referral_paid_at: Date | null;
  referral_paid_by: string | null;
  referral_payout_amount: number | null;
  referral_payout_ref: string | null;
}

/**
 * Initialize the orders table schema in Neon Postgres.
 * Safe to call multiple times (uses CREATE TABLE IF NOT EXISTS).
 *
 * @throws {Error} If table creation fails
 */
export async function initializeDatabase(): Promise<void> {
  const sql = getClient();
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        customer_name VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(20) NOT NULL,
        site_address TEXT NOT NULL,
        landmark TEXT,
        delivery_type VARCHAR(20) NOT NULL CHECK (delivery_type IN ('urgent', 'scheduled')),
        scheduled_time TIMESTAMP WITH TIME ZONE,
        items JSONB NOT NULL,
        subtotal INTEGER NOT NULL,
        convenience_fee INTEGER NOT NULL,
        total INTEGER NOT NULL,
        payment_method VARCHAR(20) NOT NULL DEFAULT 'cod',
        status VARCHAR(50) NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'eta_assigned', 'out_for_delivery', 'delivered', 'cancelled')),
        eta TEXT,
        status_token VARCHAR(32) UNIQUE NOT NULL,
        update_token VARCHAR(32) UNIQUE NOT NULL,
        user_id UUID,
        status_history JSONB NOT NULL DEFAULT '[]'::jsonb
      )
    `;

    // Migration: add status_history to orders tables created before this column
    // existed. Backend code always appends to it, so old rows would otherwise
    // have a NULL/missing history - the DEFAULT here covers that on ALTER too
    // (Postgres backfills the default for existing rows).
    await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS status_history JSONB NOT NULL DEFAULT '[]'::jsonb`;

    // Migration: add discount (first-order coupon, rupees) to orders tables
    // created before this column existed.
    await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount INTEGER NOT NULL DEFAULT 0`;

    // Create indexes for faster lookups
    await sql`CREATE INDEX IF NOT EXISTS idx_orders_status_token ON orders(status_token)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_orders_update_token ON orders(update_token)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC)`;

    logger.info('DB', 'Orders table initialized successfully');
  } catch (error) {
    logger.error('DB', 'Failed to initialize orders table', { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

/**
 * Initialize users table for Phase 1 user management.
 * Supports customer, agent, and admin roles.
 */
export async function initializeUsersTable(): Promise<void> {
  const sql = getClient();
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL DEFAULT 'User',
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255),
        phone VARCHAR(20) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'agent', 'admin')),
        preferred_address_id UUID,
        last_order_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Ensure existing databases get the new name column
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255) NOT NULL DEFAULT 'User'`;

    // Migration 009: email verification and password reset fields
    // DEFAULT true keeps all pre-existing users in a verified state (backward compat)
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT true`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255)`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token_expiry TIMESTAMPTZ`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_token VARCHAR(255)`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_token_expiry TIMESTAMPTZ`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS resend_verification_at TIMESTAMPTZ`;

    // Migration 015: Telegram chat ID for new-order notifications (staff self-link via my-profile)
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_chat_id VARCHAR(64)`;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token) WHERE verification_token IS NOT NULL`;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_reset_password_token ON users(reset_password_token) WHERE reset_password_token IS NOT NULL`;

    await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC)`;

    logger.info('DB', 'Users table initialized successfully');
  } catch (error) {
    logger.error('DB', 'Failed to initialize users table', { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

/**
 * Initialize user_addresses table for storing multiple addresses per user.
 * Supports home, work, and other address types.
 */
export async function initializeUserAddressesTable(): Promise<void> {
  const sql = getClient();
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS user_addresses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        type VARCHAR(20) NOT NULL CHECK (type IN ('home', 'work', 'other')),
        street TEXT NOT NULL,
        landmark TEXT,
        city VARCHAR(100) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        is_primary BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_user_addresses_user_id
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON user_addresses(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_user_addresses_is_primary ON user_addresses(user_id, is_primary)`;
    // Enforce at DB level: at most one primary address per user
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_user_addresses_one_primary ON user_addresses(user_id) WHERE is_primary = true`;

    logger.info('DB', 'User addresses table initialized successfully');
  } catch (error) {
    logger.error('DB', 'Failed to initialize user addresses table', { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

/**
 * Initialize categories table for product organization.
 */
export async function initializeCategoriesTable(): Promise<void> {
  const sql = getClient();
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug)`;

    logger.info('DB', 'Categories table initialized successfully');
  } catch (error) {
    logger.error('DB', 'Failed to initialize categories table', { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

/**
 * Initialize products table for catalog management.
 * Price is in paise (1 rupee = 100 paise).
 */
export async function initializeProductsTable(): Promise<void> {
  const sql = getClient();
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category_id UUID,
        price INTEGER NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'discontinued')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_products_category_id
          FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
      )
    `;

    // Add extended columns that the catalog queries reference (safe to run multiple times)
    await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS product_code VARCHAR(255)`;
    await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS brand VARCHAR(255)`;
    await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT`;
    await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS uom VARCHAR(50)`;

    await sql`CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_products_status ON products(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC)`;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_products_product_code ON products(product_code) WHERE product_code IS NOT NULL`;

    logger.info('DB', 'Products table initialized successfully');
  } catch (error) {
    logger.error('DB', 'Failed to initialize products table', { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

/**
 * Initialize product_variants table for SKUs and variant tracking.
 * Attributes stored as JSONB for flexibility (e.g., {"size": "M", "color": "red"}).
 * Price override allows variants to have different prices from base product.
 * Stock quantity tracks inventory per variant.
 */
export async function initializeProductVariantsTable(): Promise<void> {
  const sql = getClient();
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS product_variants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL,
        sku VARCHAR(255) NOT NULL UNIQUE, 
        price_override INTEGER,
        stock_quantity INTEGER DEFAULT 0,
        attributes JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_product_variants_product_id
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `;

    // Add mrp_price and moq columns referenced by catalog queries
    await sql`ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS mrp_price INTEGER`;
    await sql`ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS moq INTEGER NOT NULL DEFAULT 1`;

    await sql`CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON product_variants(sku)`;

    logger.info('DB', 'Product variants table initialized successfully');
  } catch (error) {
    logger.error('DB', 'Failed to initialize product variants table', { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

/**
 * Initialize wishlists table for user favorites.
 * Stores product_id (TEXT) so any product from any category table can be saved,
 * and product_data (JSONB) snapshot so the wishlist page needs no extra joins.
 */
export async function initializeWishlistsTable(): Promise<void> {
  const sql = getClient();
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS wishlists (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        product_id TEXT NOT NULL,
        product_data JSONB,
        added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_wishlists_user_id
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT uk_wishlists_user_product
          UNIQUE (user_id, product_id)
      )
    `;

    // Migration safety: add columns and constraint for DBs using the old schema
    await sql`ALTER TABLE wishlists ADD COLUMN IF NOT EXISTS product_id TEXT`;
    await sql`ALTER TABLE wishlists ADD COLUMN IF NOT EXISTS product_data JSONB`;
    try {
      await sql`ALTER TABLE wishlists ADD CONSTRAINT uk_wishlists_user_product UNIQUE (user_id, product_id)`;
    } catch {
      // constraint already exists - safe to ignore
    }

    await sql`CREATE INDEX IF NOT EXISTS idx_wishlists_user_id ON wishlists(user_id)`;

    logger.info('DB', 'Wishlists table initialized successfully');
  } catch (error) {
    logger.error('DB', 'Failed to initialize wishlists table', { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

/**
 * Get all wishlist items for a user, returning the stored product snapshots.
 */
export async function getWishlistByUserId(userId: string): Promise<object[]> {
  const sql = getUnpooledClient();
  try {
    const result = await sql`
      SELECT product_data FROM wishlists
      WHERE user_id = ${userId} AND product_id IS NOT NULL
      ORDER BY added_at DESC
    `;
    return result.map(row => row.product_data as object).filter(Boolean);
  } catch (error) {
    logger.error('DB', 'Failed to get wishlist', { error: error instanceof Error ? error.message : String(error) });
    return [];
  }
}

/**
 * Add a product to a user's wishlist.
 * Silently ignores duplicates (ON CONFLICT DO NOTHING).
 */
export async function addToWishlist(
  userId: string,
  productId: string,
  productData: object
): Promise<boolean> {
  const sql = getClient();
  try {
    await sql`
      INSERT INTO wishlists (user_id, product_id, product_data)
      VALUES (${userId}, ${productId}, ${JSON.stringify(productData)})
      ON CONFLICT (user_id, product_id) DO UPDATE
        SET product_data = ${JSON.stringify(productData)}, added_at = CURRENT_TIMESTAMP
    `;
    return true;
  } catch (error) {
    logger.error('DB', 'Failed to add to wishlist', { error: error instanceof Error ? error.message : String(error) });
    return false;
  }
}

/**
 * Remove a product from a user's wishlist.
 */
export async function removeFromWishlist(userId: string, productId: string): Promise<boolean> {
  const sql = getClient();
  try {
    await sql`
      DELETE FROM wishlists
      WHERE user_id = ${userId} AND product_id = ${productId}
    `;
    return true;
  } catch (error) {
    logger.error('DB', 'Failed to remove from wishlist', { error: error instanceof Error ? error.message : String(error) });
    return false;
  }
}

/**
 * Initialize product_reviews table. A review is tied to a specific delivered
 * order so it always represents a verified purchase - one review per
 * (order, product) pair, editable via ON CONFLICT upsert.
 */
export async function initializeProductReviewsTable(): Promise<void> {
  const sql = getClient();
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS product_reviews (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_code VARCHAR(255) NOT NULL,
        product_name VARCHAR(255) NOT NULL DEFAULT '',
        order_id UUID NOT NULL,
        user_id UUID NOT NULL,
        rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
        comment TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_product_reviews_order_id
          FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        CONSTRAINT fk_product_reviews_user_id
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT uk_product_reviews_order_product UNIQUE (order_id, product_code)
      )
    `;

    // Denormalized name snapshot - added after the table originally shipped;
    // safe no-op on fresh installs where the CREATE TABLE above already has it.
    await sql`ALTER TABLE product_reviews ADD COLUMN IF NOT EXISTS product_name VARCHAR(255) NOT NULL DEFAULT ''`;

    await sql`CREATE INDEX IF NOT EXISTS idx_product_reviews_product_code ON product_reviews(product_code)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_product_reviews_user_id ON product_reviews(user_id)`;

    logger.info('DB', 'Product reviews table initialized successfully');
  } catch (error) {
    logger.error('DB', 'Failed to initialize product reviews table', { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

/**
 * Initialize order_feedback table. One delivery-experience rating + comment
 * per order, editable via ON CONFLICT upsert.
 */
export async function initializeOrderFeedbackTable(): Promise<void> {
  const sql = getClient();
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS order_feedback (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID NOT NULL UNIQUE,
        user_id UUID NOT NULL,
        rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
        comment TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_order_feedback_order_id
          FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        CONSTRAINT fk_order_feedback_user_id
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_order_feedback_user_id ON order_feedback(user_id)`;

    logger.info('DB', 'Order feedback table initialized successfully');
  } catch (error) {
    logger.error('DB', 'Failed to initialize order feedback table', { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

/**
 * Add user_id foreign key to existing orders table.
 * Safe to call multiple times (uses ALTER TABLE IF EXISTS).
 */
export async function addUserIdToOrders(): Promise<void> {
  const sql = getClient();
  try {
    // Check if column already exists
    const result = await sql`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'orders' AND column_name = 'user_id'
    `;

    if (result.length === 0) {
      // Column doesn't exist, add it
      await sql`
        ALTER TABLE orders
        ADD COLUMN user_id UUID,
        ADD CONSTRAINT fk_orders_user_id
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      `;
      
      // Add index for faster lookups
      await sql`CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id)`;
      
      logger.info('DB', 'Added user_id column to orders table');
    } else {
      logger.debug('DB', 'user_id column already exists on orders table');
    }
  } catch (error) {
    logger.error('DB', 'Failed to add user_id to orders table', { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

/**
 * Initialize carts table for server-side persistence of a logged-in user's
 * shopping cart, so it is restored on login on any device.
 */
export async function initializeCartsTable(): Promise<void> {
  const sql = getClient();
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS carts (
        user_id UUID PRIMARY KEY,
        items JSONB NOT NULL DEFAULT '[]',
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_carts_user_id
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `;
    logger.info('DB', 'Carts table initialized successfully');
  } catch (error) {
    logger.error('DB', 'Failed to initialize carts table', { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

/**
 * Get a user's saved cart items (product snapshot + quantity), as stored by saveCart().
 */
export async function getCartByUserId(userId: string): Promise<CartItem[]> {
  const sql = getUnpooledClient();
  try {
    const result = await sql`
      SELECT items FROM carts WHERE user_id = ${userId}
    `;
    const items = result[0]?.items;
    return Array.isArray(items) ? (items as CartItem[]) : [];
  } catch (error) {
    logger.error('DB', 'Failed to get cart', { error: error instanceof Error ? error.message : String(error) });
    return [];
  }
}

/**
 * Save (replace) a user's cart items.
 */
export async function saveCart(userId: string, items: CartItem[]): Promise<boolean> {
  const sql = getClient();
  try {
    await sql`
      INSERT INTO carts (user_id, items, updated_at)
      VALUES (${userId}, ${JSON.stringify(items)}, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id) DO UPDATE
        SET items = ${JSON.stringify(items)}, updated_at = CURRENT_TIMESTAMP
    `;
    return true;
  } catch (error) {
    logger.error('DB', 'Failed to save cart', { error: error instanceof Error ? error.message : String(error) });
    return false;
  }
}

/**
 * Initialize coin_transactions (ledger) and users.coin_balance (cached total)
 * for the loyalty coins program. Must run after users + orders exist (FKs).
 */
export async function initializeCoinsTable(): Promise<void> {
  const sql = getClient();
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS coin_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
        amount INTEGER NOT NULL,
        reason VARCHAR(30) NOT NULL CHECK (reason IN ('order_delivered', 'redemption', 'redemption_refund', 'admin_adjustment')),
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_coin_transactions_user ON coin_transactions(user_id, created_at DESC)`;
    // One earn-credit and one refund per order - guards against double-crediting on retry.
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS uq_coin_tx_order_delivered ON coin_transactions(order_id) WHERE reason = 'order_delivered'`;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS uq_coin_tx_order_refund ON coin_transactions(order_id) WHERE reason = 'redemption_refund'`;

    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS coin_balance INTEGER NOT NULL DEFAULT 0`;

    logger.info('DB', 'Coins table initialized successfully');
  } catch (error) {
    logger.error('DB', 'Failed to initialize coins table', { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

/**
 * Initialize all tables for Phase 1 and Phase 2.
 * Safe to call multiple times.
 */
export async function initializeAllTables(): Promise<void> {
  try {
    logger.info('DB', 'Starting database initialization...');

    // Phase 1: User Management
    await initializeUsersTable();
    await initializeUserAddressesTable();

    // Phase 2: Product Catalog
    await initializeCategoriesTable();
    await initializeProductsTable();
    await initializeProductVariantsTable();

    // Phase 4: User Preferences
    await initializeWishlistsTable();
    await initializeCartsTable();

    // Orders table (with user_id support)
    await initializeDatabase();
    await addUserIdToOrders();

    // Phase 5: Reviews & Feedback
    await initializeProductReviewsTable();
    await initializeOrderFeedbackTable();

    // Coins loyalty program (depends on users + orders existing)
    await initializeCoinsTable();

    logger.info('DB', 'All tables initialized successfully');
  } catch (error) {
    logger.error('DB', 'Failed to initialize all tables', { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

/**
 * Create a new order in the database.
 *
 * @param {Order} order - The order object to insert
 * @returns {Promise<boolean>} true on success, false on failure
 */
export async function createOrder(order: Order): Promise<boolean> {
  const sql = getClient();
  // Seed the status timeline with the order's initial status (normally
  // 'received') so the admin-facing history always has a starting point.
  const initialHistory = JSON.stringify([{ status: order.status, timestamp: order.createdAt }]);
  try {
    await sql`
      INSERT INTO orders (
        id, created_at, customer_name, customer_phone, site_address, landmark,
        delivery_type, scheduled_time, items, subtotal, convenience_fee, discount, total,
        payment_method, status, eta, status_token, update_token, user_id, status_history,
        referral_code, referrer_user_id
      ) VALUES (
        ${order.id}, ${order.createdAt}, ${order.customerName}, ${order.customerPhone},
        ${order.siteAddress}, ${order.landmark || null}, ${order.deliveryType},
        ${order.scheduledTime || null}, ${JSON.stringify(order.items)}, ${order.subtotal},
        ${order.convenienceFee}, ${order.discount || 0}, ${order.total}, ${order.paymentMethod}, ${order.status},
        ${order.eta || null}, ${order.statusToken}, ${order.updateToken}, ${order.userId || null},
        ${initialHistory}, ${order.referralCode || null}, ${order.referrerUserId || null}
      )
    `;
    logger.info('DB', 'Order created successfully', { orderId: order.id });
    return true;
  } catch (error) {
    logger.error('DB', 'Failed to create order', {
      orderId: order.id,
      error: error instanceof Error ? error.message : String(error),
    });

    // If the user_id FK is violated (stale/deleted user attribution), don't lose
    // the sale - retry once as an unattributed order (user_id NULL). The schema
    // explicitly allows a null user_id (guest orders, ON DELETE SET NULL).
    // Any referral is dropped too - it's tied to the (missing) customer account.
    if (error instanceof Error && error.message.includes('fk_orders_user_id')) {
      logger.warn('DB', 'Order user_id has no matching user - saving order unattributed', {
        orderId: order.id,
        userId: order.userId,
      });
      try {
        await sql`
          INSERT INTO orders (
            id, created_at, customer_name, customer_phone, site_address, landmark,
            delivery_type, scheduled_time, items, subtotal, convenience_fee, discount, total,
            payment_method, status, eta, status_token, update_token, user_id, status_history
          ) VALUES (
            ${order.id}, ${order.createdAt}, ${order.customerName}, ${order.customerPhone},
            ${order.siteAddress}, ${order.landmark || null}, ${order.deliveryType},
            ${order.scheduledTime || null}, ${JSON.stringify(order.items)}, ${order.subtotal},
            ${order.convenienceFee}, ${order.discount || 0}, ${order.total}, ${order.paymentMethod}, ${order.status},
            ${order.eta || null}, ${order.statusToken}, ${order.updateToken}, ${null},
            ${initialHistory}
          )
        `;
        logger.info('DB', 'Order created successfully (unattributed)', { orderId: order.id });
        return true;
      } catch (retryError) {
        logger.error('DB', 'Failed to create order unattributed after FK violation', {
          orderId: order.id,
          error: retryError instanceof Error ? retryError.message : String(retryError),
        });
        return false;
      }
    }

    // If table doesn't exist, try to initialize it once
    if (error instanceof Error && error.message.includes('relation "orders" does not exist')) {
      logger.warn('DB', 'Orders table missing - attempting auto-init');
      try {
        await initializeDatabase();
        logger.info('DB', 'DB auto-init succeeded, retrying order creation');
        // Retry the insert
        await sql`
          INSERT INTO orders (
            id, created_at, customer_name, customer_phone, site_address, landmark,
            delivery_type, scheduled_time, items, subtotal, convenience_fee, discount, total,
            payment_method, status, eta, status_token, update_token, user_id, status_history
          ) VALUES (
            ${order.id}, ${order.createdAt}, ${order.customerName}, ${order.customerPhone},
            ${order.siteAddress}, ${order.landmark || null}, ${order.deliveryType},
            ${order.scheduledTime || null}, ${JSON.stringify(order.items)}, ${order.subtotal},
            ${order.convenienceFee}, ${order.discount || 0}, ${order.total}, ${order.paymentMethod}, ${order.status},
            ${order.eta || null}, ${order.statusToken}, ${order.updateToken}, ${order.userId || null},
            ${initialHistory}
          )
        `;
        return true;
      } catch (initError) {
        logger.error('DB', 'Failed to initialize database and retry order creation', { error: initError instanceof Error ? initError.message : String(initError) });
        return false;
      }
    }
    
    return false;
  }
}

/**
 * Retrieve an order by its status token (customer-facing).
 *
 * @param {string} token - The status_token from order creation response
 * @returns {Promise<Order | null>}
 */
export async function getOrderByStatusToken(token: string): Promise<Order | null> {
  const sql = getUnpooledClient();
  try {
    const normalizedToken = token.toLowerCase();

    const result = await sql`
      SELECT * FROM orders WHERE LOWER(status_token) = ${normalizedToken} LIMIT 1
    `;

    if (result.length === 0) {
      return null;
    }

    return dbOrderToOrder(result[0] as DbOrder);
  } catch (error) {
    logger.error('DB', 'Failed to get order by status token', { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

/**
 * Update an order's status (transition validated against VALID_STATUS_TRANSITIONS).
 * Authorization is enforced by the calling route (admin session).
 *
 * @param {string} orderId
 * @param {OrderStatus} newStatus
 * @param {string} [eta]
 * @returns {Promise<{success: boolean, error?: string, orderId?: string, changedAt?: string}>}
 */
export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  eta?: string
): Promise<{ success: boolean; error?: string; orderId?: string; changedAt?: string }> {
  try {
    // Authorization is handled by the route (admin session) - no shared PIN.
    // Fetch current order to validate transition.
    const currentOrder = await getOrderById(orderId);

    if (!currentOrder) {
      return { success: false, error: 'Order not found' };
    }

    // Validate status transition
    const validTransitions = VALID_STATUS_TRANSITIONS[currentOrder.status];
    if (!validTransitions.includes(newStatus)) {
      return {
        success: false,
        error: `Cannot transition from ${currentOrder.status} to ${newStatus}`,
      };
    }

    // Use unpooled connection for writes to ensure consistency
    const sqlConn = getUnpooledClient();

    // Recorded once so the appended history entry and the returned changedAt
    // (used by the API response) refer to the exact same instant.
    const changedAt = new Date().toISOString();
    const historyAppend = JSON.stringify([{ status: newStatus, timestamp: changedAt }]);

    let result;
    if (eta) {
      result = await sqlConn`
        UPDATE orders
        SET status = ${newStatus}, eta = ${eta}, status_history = status_history || ${historyAppend}::jsonb
        WHERE id = ${orderId} AND status = ${currentOrder.status}
        RETURNING id
      `;
    } else {
      result = await sqlConn`
        UPDATE orders
        SET status = ${newStatus}, status_history = status_history || ${historyAppend}::jsonb
        WHERE id = ${orderId} AND status = ${currentOrder.status}
        RETURNING id
      `;
    }

    // If no rows updated, a race condition changed the status
    if (result.length === 0) {
      return { success: false, error: 'Order status changed by another agent. Please refresh.' };
    }

    // Coins are best-effort side effects of the transition above - a failure
    // here must not fail the status update itself (delivery/cancellation is
    // the primary effect). Guest orders (no userId) don't participate.
    if (currentOrder.userId) {
      if (newStatus === 'delivered') {
        const coinsEarned = Math.round(currentOrder.total * 0.10);
        if (coinsEarned > 0) {
          await creditCoins(currentOrder.userId, coinsEarned, 'order_delivered', orderId);
        }
      } else if (newStatus === 'cancelled') {
        const redeemed = await getRedeemedCoinsForOrder(orderId);
        if (redeemed > 0) {
          await creditCoins(currentOrder.userId, redeemed, 'redemption_refund', orderId);
        }
      }
    }

    return { success: true, orderId: currentOrder.id, changedAt };
  } catch (error) {
    logger.error('DB', 'Failed to update order status', { error: error instanceof Error ? error.message : String(error) });
    return { success: false, error: 'Database error' };
  }
}

/**
 * Get recent orders (for admin/ops dashboards).
 *
 * @param {number} [limit=50]
 * @returns {Promise<Order[]>}
 */
export async function getRecentOrders(limit: number = 50): Promise<Order[]> {
  const sql = getUnpooledClient();
  try {
    const result = await sql`
      SELECT * FROM orders
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;

    return (result as DbOrder[]).map(dbOrderToOrder);
  } catch (error) {
    logger.error('DB', 'Failed to get recent orders', { error: error instanceof Error ? error.message : String(error) });
    return [];
  }
}

/**
 * Get a single order by its UUID (for admin detail view).
 *
 * @param {string} id - The order UUID
 * @returns {Promise<Order | null>}
 */
export async function getOrderById(id: string): Promise<Order | null> {
  const sql = getUnpooledClient();
  try {
    const result = await sql`
      SELECT * FROM orders WHERE id = ${id} LIMIT 1
    `;
    if (result.length === 0) return null;
    return dbOrderToOrder(result[0] as DbOrder);
  } catch (error) {
    logger.error('DB', 'Failed to get order by id', { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

/**
 * Get orders filtered by status.
 *
 * @param {OrderStatus} status
 * @returns {Promise<Order[]>}
 */
export async function getOrdersByStatus(status: OrderStatus): Promise<Order[]> {
  const sql = getUnpooledClient();
  try {
    const result = await sql`
      SELECT * FROM orders
      WHERE status = ${status}
      ORDER BY created_at DESC
    `;

    return (result as DbOrder[]).map(dbOrderToOrder);
  } catch (error) {
    logger.error('DB', 'Failed to get orders by status', { error: error instanceof Error ? error.message : String(error) });
    return [];
  }
}

/* ─── Admin order search & stats ─────────────────────────────────────────── */

/**
 * Filters for the admin order list and CSV export. Dates are calendar days
 * (YYYY-MM-DD) in India time, so "From 5 Oct" means from 00:00 IST - the same
 * whether the query runs on a laptop in IST or a Vercel function in UTC.
 */
export interface AdminOrderFilters {
  status?: OrderStatus;
  payment?: PaymentMethod;
  q?: string; // customer name, phone, or order id prefix
  dateFrom?: string; // YYYY-MM-DD, inclusive (IST)
  dateTo?: string; // YYYY-MM-DD, inclusive (IST)
}

/** Escape LIKE wildcards so a search for "50%" matches the literal text. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/**
 * Filtered, paginated admin order list. Filtering happens in SQL, so it covers
 * every order rather than just a recent slice. Returns null on a DB error so
 * the page can say so instead of showing an empty list.
 */
export async function searchOrdersForAdmin(
  filters: AdminOrderFilters,
  limit: number,
  offset: number,
): Promise<{ orders: Order[]; total: number } | null> {
  const sql = getUnpooledClient();
  const status = filters.status ?? null;
  const payment = filters.payment ?? null;
  const q = filters.q?.trim() ? `%${escapeLike(filters.q.trim())}%` : null;
  const idPrefix = filters.q?.trim() ? `${escapeLike(filters.q.trim().toLowerCase())}%` : null;
  const dateFrom = filters.dateFrom || null;
  const dateTo = filters.dateTo || null;
  try {
    const result = await sql`
      SELECT *, COUNT(*) OVER() AS full_count
      FROM orders
      WHERE (${status}::text IS NULL OR status = ${status})
        AND (${payment}::text IS NULL OR payment_method = ${payment})
        AND (${q}::text IS NULL
             OR customer_name ILIKE ${q}
             OR customer_phone LIKE ${q}
             OR id::text LIKE ${idPrefix})
        AND (${dateFrom}::date IS NULL
             OR created_at >= (${dateFrom}::date)::timestamp AT TIME ZONE 'Asia/Kolkata')
        AND (${dateTo}::date IS NULL
             OR created_at < (${dateTo}::date + 1)::timestamp AT TIME ZONE 'Asia/Kolkata')
      ORDER BY created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;
    const total = result.length > 0 ? Number(result[0].full_count) : 0;
    return { orders: (result as DbOrder[]).map(dbOrderToOrder), total };
  } catch (error) {
    logger.error('DB', 'Failed to search orders for admin', { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

export interface AdminOrderStats {
  statusCounts: Partial<Record<OrderStatus, number>>;
  totalOrders: number;
  /** Value of orders that weren't cancelled and were either COD or paid online (rupees). */
  bookedRevenue: number;
  /** Value of delivered orders only (rupees) - money actually collected. */
  deliveredRevenue: number;
}

/**
 * Order counts and revenue across ALL orders (or one IST date range), computed
 * in SQL. Cancelled orders and online orders whose payment never completed are
 * excluded from revenue. Returns null on a DB error.
 */
export async function getAdminOrderStats(dateFrom?: string, dateTo?: string): Promise<AdminOrderStats | null> {
  const sql = getUnpooledClient();
  const from = dateFrom || null;
  const to = dateTo || null;
  try {
    const rows = await sql`
      SELECT status,
             COUNT(*)::int AS count,
             COALESCE(SUM(total) FILTER (
               WHERE status <> 'cancelled' AND (payment_method = 'cod' OR payment_status = 'captured')
             ), 0)::bigint AS booked,
             COALESCE(SUM(total) FILTER (WHERE status = 'delivered'), 0)::bigint AS delivered
      FROM orders
      WHERE (${from}::date IS NULL
             OR created_at >= (${from}::date)::timestamp AT TIME ZONE 'Asia/Kolkata')
        AND (${to}::date IS NULL
             OR created_at < (${to}::date + 1)::timestamp AT TIME ZONE 'Asia/Kolkata')
      GROUP BY status
    `;
    const stats: AdminOrderStats = { statusCounts: {}, totalOrders: 0, bookedRevenue: 0, deliveredRevenue: 0 };
    for (const row of rows) {
      const count = Number(row.count);
      stats.statusCounts[row.status as OrderStatus] = count;
      stats.totalOrders += count;
      stats.bookedRevenue += Number(row.booked);
      stats.deliveredRevenue += Number(row.delivered);
    }
    return stats;
  } catch (error) {
    logger.error('DB', 'Failed to get admin order stats', { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

/**
 * Convert database row format to API Order object.
 * Maps snake_case columns to camelCase properties.
 * @private
 */
function dbOrderToOrder(dbOrder: DbOrder): Order {
  return {
    id: dbOrder.id,
    // created_at from Neon may be a Date object or a string – handle both
    createdAt:
      dbOrder.created_at instanceof Date
        ? dbOrder.created_at.toISOString()
        : String(dbOrder.created_at),
    customerName: dbOrder.customer_name,
    customerPhone: dbOrder.customer_phone,
    siteAddress: dbOrder.site_address,
    landmark: dbOrder.landmark || undefined,
    deliveryType: dbOrder.delivery_type,
    scheduledTime: dbOrder.scheduled_time
      ? dbOrder.scheduled_time instanceof Date
        ? dbOrder.scheduled_time.toISOString()
        : String(dbOrder.scheduled_time)
      : undefined,
    items: dbOrder.items,
    subtotal: dbOrder.subtotal,
    convenienceFee: dbOrder.convenience_fee,
    discount: dbOrder.discount || 0,
    total: dbOrder.total,
    paymentMethod: dbOrder.payment_method as PaymentMethod,
    paymentStatus: dbOrder.payment_status ?? null,
    razorpayPaymentId: dbOrder.razorpay_payment_id || undefined,
    status: dbOrder.status,
    eta: dbOrder.eta || undefined,
    statusToken: dbOrder.status_token,
    updateToken: dbOrder.update_token,
    userId: dbOrder.user_id || undefined,
    statusHistory: dbOrder.status_history || [],
    referralCode: dbOrder.referral_code || undefined,
    referrerUserId: dbOrder.referrer_user_id || undefined,
    referralPaidAt: dbOrder.referral_paid_at ? toIso(dbOrder.referral_paid_at) : undefined,
    referralPayoutAmount: dbOrder.referral_payout_amount ?? undefined,
    referralPayoutRef: dbOrder.referral_payout_ref || undefined,
  };
}

/**
 * Get all orders placed by a specific user (by user_id).
 */
export async function getOrdersByUserId(userId: string): Promise<Order[]> {
  const sql = getUnpooledClient();
  try {
    const result = await sql`
      SELECT * FROM orders
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;
    return (result as DbOrder[]).map(dbOrderToOrder);
  } catch (error) {
    logger.error('DB', 'Failed to get orders by user_id', { error: error instanceof Error ? error.message : String(error) });
    return [];
  }
}

/**
 * Whether a user has ever placed an order (any status) - used to gate the
 * first-order coupon. A lightweight existence check rather than fetching
 * every order, since only presence/absence of a row matters here.
 */
export async function hasUserOrderedBefore(userId: string): Promise<boolean> {
  const sql = getUnpooledClient();
  try {
    const result = await sql`SELECT 1 FROM orders WHERE user_id = ${userId} LIMIT 1`;
    return result.length > 0;
  } catch (error) {
    logger.error('DB', 'Failed to check prior orders for user', { userId, error: error instanceof Error ? error.message : String(error) });
    // Fail closed on the coupon (treat as "not eligible") rather than risk
    // granting it repeatedly if the existence check errors out.
    return true;
  }
}

/**
 * Whether the user has any order that isn't cancelled - referral codes only
 * apply to a first order. Fails closed (true) like hasUserOrderedBefore.
 */
export async function hasNonCancelledOrder(userId: string): Promise<boolean> {
  const sql = getUnpooledClient();
  try {
    const result = await sql`SELECT 1 FROM orders WHERE user_id = ${userId} AND status <> 'cancelled' LIMIT 1`;
    return result.length > 0;
  } catch (error) {
    logger.error('DB', 'Failed to check non-cancelled orders for user', { userId, error: error instanceof Error ? error.message : String(error) });
    return true;
  }
}

/**
 * Cancel an order by its public statusToken (customer-facing).
 * Only allowed from 'received' or 'eta_assigned' - not once out for delivery.
 * Uses optimistic locking (WHERE status = currentStatus) to prevent race conditions.
 */
export async function cancelOrderByStatusToken(
  statusToken: string
): Promise<{ cancelled: boolean; reason?: string }> {
  const sql = getUnpooledClient();
  try {
    const rows = await sql`
      SELECT id, status FROM orders
      WHERE LOWER(status_token) = LOWER(${statusToken})
      LIMIT 1
    `;

    if (rows.length === 0) {
      return { cancelled: false, reason: 'Order not found' };
    }

    const row = rows[0] as { id: string; status: OrderStatus };
    const cancellableStatuses: OrderStatus[] = ['received', 'eta_assigned'];

    if (row.status === 'cancelled') {
      return { cancelled: false, reason: 'Order is already cancelled' };
    }
    if (row.status === 'delivered') {
      return { cancelled: false, reason: 'Delivered orders cannot be cancelled' };
    }
    if (!cancellableStatuses.includes(row.status)) {
      return { cancelled: false, reason: 'Order cannot be cancelled once it is out for delivery' };
    }

    const historyAppend = JSON.stringify([{ status: 'cancelled', timestamp: new Date().toISOString() }]);
    const result = await sql`
      UPDATE orders
      SET status = 'cancelled', status_history = status_history || ${historyAppend}::jsonb
      WHERE LOWER(status_token) = LOWER(${statusToken})
        AND status = ${row.status}
      RETURNING id
    `;

    if (result.length === 0) {
      return { cancelled: false, reason: 'Order status changed - please refresh and try again' };
    }

    logger.info('DB', 'Order cancelled by customer', { statusToken });
    return { cancelled: true };
  } catch (error) {
    logger.error('DB', 'Failed to cancel order by status token', {
      error: error instanceof Error ? error.message : String(error),
    });
    return { cancelled: false, reason: 'Database error' };
  }
}

/* ─── Reviews & Feedback ────────────────────────────────────────────────── */

export interface ProductReview {
  id: string;
  productCode: string;
  productName: string;
  orderId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderFeedback {
  id: string;
  orderId: string;
  userId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

function rowToProductReview(row: Record<string, unknown>): ProductReview {
  return {
    id: row.id as string,
    productCode: row.product_code as string,
    productName: (row.product_name as string) ?? '',
    orderId: row.order_id as string,
    userId: row.user_id as string,
    userName: (row.user_name as string) ?? '',
    rating: row.rating as number,
    comment: (row.comment as string) ?? null,
    createdAt: toIso(row.created_at as Date | string),
    updatedAt: toIso(row.updated_at as Date | string),
  };
}

function rowToOrderFeedback(row: Record<string, unknown>): OrderFeedback {
  return {
    id: row.id as string,
    orderId: row.order_id as string,
    userId: row.user_id as string,
    rating: row.rating as number,
    comment: (row.comment as string) ?? null,
    createdAt: toIso(row.created_at as Date | string),
    updatedAt: toIso(row.updated_at as Date | string),
  };
}

/**
 * Create or update a customer's review for a product on a given order
 * (one review per order+product - callers must have already verified the
 * order belongs to the user, is 'delivered', and contains this product).
 */
function isMissingRelation(error: unknown, table: string): boolean {
  return error instanceof Error && error.message.includes(`relation "${table}" does not exist`);
}

export type UpsertReviewResult =
  | { ok: true; review: ProductReview }
  | { ok: false; reason: 'expired' | 'error' };

export type UpsertFeedbackResult =
  | { ok: true; feedback: OrderFeedback }
  | { ok: false; reason: 'expired' | 'error' };

/**
 * Create or update a customer's review for a product on a given order. Edits
 * are only accepted within REVIEW_EDIT_WINDOW_MINUTES of the review's first
 * submission - enforced atomically via the ON CONFLICT ... WHERE clause, so a
 * conflicting row outside the window is left untouched (0 rows returned)
 * rather than silently overwritten.
 */
export async function upsertProductReview(
  orderId: string,
  userId: string,
  productCode: string,
  productName: string,
  rating: number,
  comment: string | null
): Promise<UpsertReviewResult> {
  const sql = getClient();
  const insert = () => sql`
    INSERT INTO product_reviews (order_id, user_id, product_code, product_name, rating, comment)
    VALUES (${orderId}, ${userId}, ${productCode}, ${productName}, ${rating}, ${comment})
    ON CONFLICT (order_id, product_code) DO UPDATE
      SET rating = ${rating}, comment = ${comment}, product_name = ${productName}, updated_at = CURRENT_TIMESTAMP
      WHERE product_reviews.created_at > CURRENT_TIMESTAMP - (${REVIEW_EDIT_WINDOW_MINUTES} * INTERVAL '1 minute')
    RETURNING id, order_id, user_id, product_code, product_name, rating, comment, created_at, updated_at
  `;
  try {
    const result = await insert();
    if (result.length === 0) return { ok: false, reason: 'expired' };
    return { ok: true, review: rowToProductReview(result[0] as Record<string, unknown>) };
  } catch (error) {
    if (isMissingRelation(error, 'product_reviews')) {
      await initializeProductReviewsTable();
      const result = await insert();
      if (result.length === 0) return { ok: false, reason: 'expired' };
      return { ok: true, review: rowToProductReview(result[0] as Record<string, unknown>) };
    }
    logger.error('DB', 'Failed to upsert product review', { error: error instanceof Error ? error.message : String(error) });
    return { ok: false, reason: 'error' };
  }
}

/**
 * Get all reviews for a product (public - shown on the product detail page),
 * plus the average rating and review count.
 */
export async function getProductReviews(
  productCode: string
): Promise<{ reviews: ProductReview[]; average: number; count: number }> {
  const sql = getUnpooledClient();
  try {
    const result = await sql`
      SELECT r.id, r.order_id, r.user_id, r.product_code, r.product_name, r.rating, r.comment, r.created_at, r.updated_at,
             COALESCE(u.name, 'FastGet Customer') AS user_name
      FROM product_reviews r
      LEFT JOIN users u ON u.id = r.user_id
      WHERE r.product_code = ${productCode}
      ORDER BY r.created_at DESC
    `;
    const reviews = (result as Record<string, unknown>[]).map(rowToProductReview);
    const count = reviews.length;
    const average = count > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / count : 0;
    return { reviews, average, count };
  } catch (error) {
    if (isMissingRelation(error, 'product_reviews')) {
      return { reviews: [], average: 0, count: 0 };
    }
    logger.error('DB', 'Failed to get product reviews', { error: error instanceof Error ? error.message : String(error) });
    return { reviews: [], average: 0, count: 0 };
  }
}

/**
 * Get the reviews a specific user has already left for a specific order
 * (used to render "already reviewed" state on the order/my-orders page).
 */
export async function getUserProductReviewsForOrder(orderId: string, userId: string): Promise<ProductReview[]> {
  const sql = getUnpooledClient();
  try {
    const result = await sql`
      SELECT id, order_id, user_id, product_code, product_name, rating, comment, created_at, updated_at
      FROM product_reviews
      WHERE order_id = ${orderId} AND user_id = ${userId}
    `;
    return (result as Record<string, unknown>[]).map(rowToProductReview);
  } catch (error) {
    if (isMissingRelation(error, 'product_reviews')) return [];
    logger.error('DB', 'Failed to get user product reviews for order', { error: error instanceof Error ? error.message : String(error) });
    return [];
  }
}

/**
 * Create or update a customer's delivery-experience feedback for an order
 * (callers must have already verified the order belongs to the user and is
 * 'delivered').
 */
export async function upsertOrderFeedback(
  orderId: string,
  userId: string,
  rating: number,
  comment: string | null
): Promise<UpsertFeedbackResult> {
  const sql = getClient();
  const insert = () => sql`
    INSERT INTO order_feedback (order_id, user_id, rating, comment)
    VALUES (${orderId}, ${userId}, ${rating}, ${comment})
    ON CONFLICT (order_id) DO UPDATE
      SET rating = ${rating}, comment = ${comment}, updated_at = CURRENT_TIMESTAMP
      WHERE order_feedback.created_at > CURRENT_TIMESTAMP - (${REVIEW_EDIT_WINDOW_MINUTES} * INTERVAL '1 minute')
    RETURNING id, order_id, user_id, rating, comment, created_at, updated_at
  `;
  try {
    const result = await insert();
    if (result.length === 0) return { ok: false, reason: 'expired' };
    return { ok: true, feedback: rowToOrderFeedback(result[0] as Record<string, unknown>) };
  } catch (error) {
    if (isMissingRelation(error, 'order_feedback')) {
      await initializeOrderFeedbackTable();
      const result = await insert();
      if (result.length === 0) return { ok: false, reason: 'expired' };
      return { ok: true, feedback: rowToOrderFeedback(result[0] as Record<string, unknown>) };
    }
    logger.error('DB', 'Failed to upsert order feedback', { error: error instanceof Error ? error.message : String(error) });
    return { ok: false, reason: 'error' };
  }
}

/** Get a user's delivery feedback for a specific order, if any. */
export async function getOrderFeedback(orderId: string, userId: string): Promise<OrderFeedback | null> {
  const sql = getUnpooledClient();
  try {
    const result = await sql`
      SELECT id, order_id, user_id, rating, comment, created_at, updated_at
      FROM order_feedback
      WHERE order_id = ${orderId} AND user_id = ${userId}
      LIMIT 1
    `;
    if (result.length === 0) return null;
    return rowToOrderFeedback(result[0] as Record<string, unknown>);
  } catch (error) {
    if (isMissingRelation(error, 'order_feedback')) return null;
    logger.error('DB', 'Failed to get order feedback', { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

/**
 * Determine whether a user may review a given product: do they have a
 * 'delivered' order containing it? Returns every delivered order that
 * contains the product plus any reviews the user already left for it, so
 * the caller can pick an unreviewed order (new review) or show an existing
 * one (edit).
 */
export async function getUserReviewEligibilityForProduct(
  userId: string,
  productCode: string
): Promise<{ eligibleOrderIds: string[]; reviews: ProductReview[] }> {
  const orders = await getOrdersByUserId(userId);
  const eligibleOrderIds = orders
    .filter((o) => o.status === 'delivered' && o.items.some((i) => i.sku === productCode))
    .map((o) => o.id);

  if (eligibleOrderIds.length === 0) {
    return { eligibleOrderIds: [], reviews: [] };
  }

  const sql = getUnpooledClient();
  try {
    const result = await sql`
      SELECT id, order_id, user_id, product_code, product_name, rating, comment, created_at, updated_at
      FROM product_reviews
      WHERE user_id = ${userId} AND product_code = ${productCode}
    `;
    return { eligibleOrderIds, reviews: (result as Record<string, unknown>[]).map(rowToProductReview) };
  } catch (error) {
    if (isMissingRelation(error, 'product_reviews')) {
      return { eligibleOrderIds, reviews: [] };
    }
    logger.error('DB', 'Failed to get user review eligibility for product', { error: error instanceof Error ? error.message : String(error) });
    return { eligibleOrderIds, reviews: [] };
  }
}

/** Get all product reviews across all products, newest first (admin dashboard). */
export async function getAllProductReviewsForAdmin(limit: number = 200): Promise<ProductReview[]> {
  const sql = getUnpooledClient();
  try {
    const result = await sql`
      SELECT r.id, r.order_id, r.user_id, r.product_code,
             COALESCE(NULLIF(r.product_name, ''), r.product_code) AS product_name,
             r.rating, r.comment, r.created_at, r.updated_at,
             COALESCE(u.name, 'Unknown') AS user_name
      FROM product_reviews r
      LEFT JOIN users u ON u.id = r.user_id
      ORDER BY r.created_at DESC
      LIMIT ${limit}
    `;
    return (result as Record<string, unknown>[]).map(rowToProductReview);
  } catch (error) {
    if (isMissingRelation(error, 'product_reviews')) return [];
    logger.error('DB', 'Failed to get all product reviews for admin', { error: error instanceof Error ? error.message : String(error) });
    return [];
  }
}

/** Get all delivery feedback across all orders, newest first (admin dashboard). */
export async function getAllOrderFeedbackForAdmin(
  limit: number = 200
): Promise<(OrderFeedback & { userName: string })[]> {
  const sql = getUnpooledClient();
  try {
    const result = await sql`
      SELECT f.id, f.order_id, f.user_id, f.rating, f.comment, f.created_at, f.updated_at,
             COALESCE(u.name, 'Unknown') AS user_name
      FROM order_feedback f
      LEFT JOIN users u ON u.id = f.user_id
      ORDER BY f.created_at DESC
      LIMIT ${limit}
    `;
    return (result as Record<string, unknown>[]).map((row) => ({
      ...rowToOrderFeedback(row),
      userName: row.user_name as string,
    }));
  } catch (error) {
    if (isMissingRelation(error, 'order_feedback')) return [];
    logger.error('DB', 'Failed to get all order feedback for admin', { error: error instanceof Error ? error.message : String(error) });
    return [];
  }
}

/**
 * Delete a customer's own product review (no edit-window restriction -
 * deletion is allowed anytime). Scoped by user_id so one customer can't
 * delete another's review.
 */
export async function deleteProductReview(orderId: string, userId: string, productCode: string): Promise<boolean> {
  const sql = getClient();
  try {
    const result = await sql`
      DELETE FROM product_reviews
      WHERE order_id = ${orderId} AND user_id = ${userId} AND product_code = ${productCode}
      RETURNING id
    `;
    return result.length > 0;
  } catch (error) {
    if (isMissingRelation(error, 'product_reviews')) return false;
    logger.error('DB', 'Failed to delete product review', { error: error instanceof Error ? error.message : String(error) });
    return false;
  }
}

/** Admin moderation delete - removes any product review by id, no ownership check. */
export async function adminDeleteProductReview(reviewId: string): Promise<boolean> {
  const sql = getClient();
  try {
    const result = await sql`DELETE FROM product_reviews WHERE id = ${reviewId} RETURNING id`;
    return result.length > 0;
  } catch (error) {
    if (isMissingRelation(error, 'product_reviews')) return false;
    logger.error('DB', 'Failed to admin-delete product review', { error: error instanceof Error ? error.message : String(error) });
    return false;
  }
}

/**
 * Delete a customer's own order feedback (no edit-window restriction).
 * Scoped by user_id so one customer can't delete another's feedback.
 */
export async function deleteOrderFeedback(orderId: string, userId: string): Promise<boolean> {
  const sql = getClient();
  try {
    const result = await sql`
      DELETE FROM order_feedback
      WHERE order_id = ${orderId} AND user_id = ${userId}
      RETURNING id
    `;
    return result.length > 0;
  } catch (error) {
    if (isMissingRelation(error, 'order_feedback')) return false;
    logger.error('DB', 'Failed to delete order feedback', { error: error instanceof Error ? error.message : String(error) });
    return false;
  }
}

/** Admin moderation delete - removes any order feedback by id, no ownership check. */
export async function adminDeleteOrderFeedback(feedbackId: string): Promise<boolean> {
  const sql = getClient();
  try {
    const result = await sql`DELETE FROM order_feedback WHERE id = ${feedbackId} RETURNING id`;
    return result.length > 0;
  } catch (error) {
    if (isMissingRelation(error, 'order_feedback')) return false;
    logger.error('DB', 'Failed to admin-delete order feedback', { error: error instanceof Error ? error.message : String(error) });
    return false;
  }
}

export type AdminDeleteOrderResult = 'deleted' | 'not_found' | 'not_cancelled' | 'error';

/**
 * Admin delete - permanently removes an order by id, no ownership check.
 * Only cancelled orders can be deleted, so a live or delivered order (and its
 * sales record) can never be wiped by a stray click - cancel it first.
 * Associated product reviews and delivery feedback cascade-delete with it
 * (ON DELETE CASCADE on their order_id foreign keys).
 */
export async function adminDeleteOrder(id: string): Promise<AdminDeleteOrderResult> {
  const sql = getClient();
  try {
    const result = await sql`DELETE FROM orders WHERE id = ${id} AND status = 'cancelled' RETURNING id`;
    if (result.length > 0) return 'deleted';
    const rows = await sql`SELECT 1 FROM orders WHERE id = ${id} LIMIT 1`;
    return rows.length === 0 ? 'not_found' : 'not_cancelled';
  } catch (error) {
    logger.error('DB', 'Failed to admin-delete order', { error: error instanceof Error ? error.message : String(error) });
    return 'error';
  }
}

/* ─── Coins loyalty program ─────────────────────────────────────────────── */

interface DbCoinTransaction {
  id: string;
  user_id: string;
  order_id: string | null;
  amount: number;
  reason: CoinTransactionReason;
  created_by: string | null;
  note?: string | null;
  created_at: Date | string;
}

function dbCoinTxToCoinTransaction(row: DbCoinTransaction): CoinTransaction {
  return {
    id: row.id,
    userId: row.user_id,
    orderId: row.order_id ?? undefined,
    amount: row.amount,
    reason: row.reason,
    createdBy: row.created_by ?? undefined,
    note: row.note ?? undefined,
    createdAt: toIso(row.created_at),
  };
}

/** True when a query failed because coin_transactions.note doesn't exist yet (migration 023 not run). */
function isMissingNoteColumn(error: unknown): boolean {
  return error instanceof Error && /column "note"/.test(error.message);
}

export interface UserCoinSummary {
  userId: string;
  name: string;
  email: string;
  phone: string;
  balance: number;
}

/** All customers with a non-zero coin balance, highest first (admin overview). */
export async function getAllCoinBalancesForAdmin(limit: number = 200): Promise<UserCoinSummary[]> {
  const sql = getUnpooledClient();
  try {
    const result = await sql`
      SELECT id, name, email, phone, coin_balance
      FROM users
      WHERE coin_balance != 0
      ORDER BY coin_balance DESC
      LIMIT ${limit}
    `;
    return (result as { id: string; name: string; email: string; phone: string; coin_balance: number }[]).map((row) => ({
      userId: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      balance: row.coin_balance,
    }));
  } catch (error) {
    logger.error('DB', 'Failed to get all coin balances for admin', { error: error instanceof Error ? error.message : String(error) });
    return [];
  }
}

/** Get a user's current coin balance (0 if the user doesn't exist). */
export async function getCoinBalance(userId: string): Promise<number> {
  const sql = getUnpooledClient();
  try {
    const result = await sql`SELECT coin_balance FROM users WHERE id = ${userId} LIMIT 1`;
    if (result.length === 0) return 0;
    return (result[0].coin_balance as number) ?? 0;
  } catch (error) {
    logger.error('DB', 'Failed to get coin balance', { userId, error: error instanceof Error ? error.message : String(error) });
    return 0;
  }
}

/** Get a user's coin ledger, newest first (admin view). */
export async function getCoinTransactions(userId: string, limit: number = 100): Promise<CoinTransaction[]> {
  const sql = getUnpooledClient();
  try {
    const result = await sql`
      SELECT id, user_id, order_id, amount, reason, created_by, note, created_at
      FROM coin_transactions
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
    return (result as DbCoinTransaction[]).map(dbCoinTxToCoinTransaction);
  } catch (error) {
    if (isMissingNoteColumn(error)) {
      const result = await sql`
        SELECT id, user_id, order_id, amount, reason, created_by, created_at
        FROM coin_transactions
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;
      return (result as DbCoinTransaction[]).map(dbCoinTxToCoinTransaction);
    }
    logger.error('DB', 'Failed to get coin transactions', { userId, error: error instanceof Error ? error.message : String(error) });
    return [];
  }
}

/**
 * Credit coins to a user - order-delivered rewards and redemption refunds.
 * Idempotent per (order_id, reason) via the partial unique indexes on
 * coin_transactions, so a retried call for the same order/reason is a no-op.
 * Returns the resulting balance, or null if nothing was credited.
 */
export async function creditCoins(
  userId: string,
  amount: number,
  reason: Extract<CoinTransactionReason, 'order_delivered' | 'redemption_refund'>,
  orderId?: string
): Promise<number | null> {
  if (amount <= 0) return null;
  const sql = getClient();
  try {
    const result = await sql`
      WITH ins AS (
        INSERT INTO coin_transactions (user_id, order_id, amount, reason)
        VALUES (${userId}, ${orderId || null}, ${amount}, ${reason})
        ON CONFLICT DO NOTHING
        RETURNING amount, user_id
      )
      UPDATE users SET coin_balance = coin_balance + (SELECT amount FROM ins)
      WHERE id = (SELECT user_id FROM ins)
      RETURNING coin_balance
    `;
    if (result.length === 0) return null;
    return result[0].coin_balance as number;
  } catch (error) {
    logger.error('DB', 'Failed to credit coins', { userId, amount, reason, orderId, error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

/**
 * Debit coins for a checkout redemption. The balance check and the debit
 * happen in the same statement (WHERE coin_balance >= amount), so this can
 * never take a balance negative even without a wrapping transaction - the
 * Neon HTTP driver has no multi-statement transaction support.
 */
export async function debitCoins(userId: string, amount: number, orderId?: string): Promise<boolean> {
  if (amount <= 0) return true;
  const sql = getClient();
  try {
    const result = await sql`
      WITH upd AS (
        UPDATE users SET coin_balance = coin_balance - ${amount}
        WHERE id = ${userId} AND coin_balance >= ${amount}
        RETURNING id
      )
      INSERT INTO coin_transactions (user_id, order_id, amount, reason)
      SELECT ${userId}, ${orderId || null}, ${-amount}, 'redemption' FROM upd
      RETURNING id
    `;
    return result.length > 0;
  } catch (error) {
    logger.error('DB', 'Failed to debit coins', { userId, amount, orderId, error: error instanceof Error ? error.message : String(error) });
    return false;
  }
}

/** The (positive) amount of coins redeemed against an order, or 0 if none. */
async function getRedeemedCoinsForOrder(orderId: string): Promise<number> {
  const sql = getUnpooledClient();
  try {
    const result = await sql`
      SELECT amount FROM coin_transactions
      WHERE order_id = ${orderId} AND reason = 'redemption'
      LIMIT 1
    `;
    if (result.length === 0) return 0;
    return Math.abs(result[0].amount as number);
  } catch (error) {
    logger.error('DB', 'Failed to get redeemed coins for order', { orderId, error: error instanceof Error ? error.message : String(error) });
    return 0;
  }
}

export type AdjustCoinsResult =
  | { success: true; balance: number }
  | { success: false; error: 'not_found' | 'insufficient_balance' | 'db_error'; balance?: number };

/**
 * Admin correction - adds or subtracts an amount with the admin's reason.
 * The balance check and the update happen in one statement (like debitCoins),
 * so a subtraction can never take a balance below zero. Always recorded in the
 * ledger with the acting admin's user id.
 */
export async function adjustCoinsAdmin(
  userId: string,
  delta: number,
  adminUserId: string,
  note: string,
): Promise<AdjustCoinsResult> {
  if (!Number.isInteger(delta) || delta === 0) return { success: false, error: 'db_error' };
  const sql = getClient();
  try {
    let result;
    try {
      result = await sql`
        WITH upd AS (
          UPDATE users SET coin_balance = coin_balance + ${delta}
          WHERE id = ${userId} AND coin_balance + ${delta} >= 0
          RETURNING id, coin_balance
        ), ins AS (
          INSERT INTO coin_transactions (user_id, order_id, amount, reason, created_by, note)
          SELECT id, NULL, ${delta}, 'admin_adjustment', ${adminUserId}, ${note} FROM upd
          RETURNING id
        )
        SELECT coin_balance FROM upd
      `;
    } catch (error) {
      if (!isMissingNoteColumn(error)) throw error;
      // Migration 023 not run yet - still record the adjustment, without its note.
      result = await sql`
        WITH upd AS (
          UPDATE users SET coin_balance = coin_balance + ${delta}
          WHERE id = ${userId} AND coin_balance + ${delta} >= 0
          RETURNING id, coin_balance
        ), ins AS (
          INSERT INTO coin_transactions (user_id, order_id, amount, reason, created_by)
          SELECT id, NULL, ${delta}, 'admin_adjustment', ${adminUserId} FROM upd
          RETURNING id
        )
        SELECT coin_balance FROM upd
      `;
    }
    if (result.length > 0) return { success: true, balance: result[0].coin_balance as number };

    // Nothing updated - either the user doesn't exist or the subtraction would go negative.
    const rows = await sql`SELECT coin_balance FROM users WHERE id = ${userId} LIMIT 1`;
    if (rows.length === 0) return { success: false, error: 'not_found' };
    return { success: false, error: 'insufficient_balance', balance: rows[0].coin_balance as number };
  } catch (error) {
    logger.error('DB', 'Failed to adjust coins (admin)', { userId, delta, error: error instanceof Error ? error.message : String(error) });
    return { success: false, error: 'db_error' };
  }
}

/* ─── Referral program (cash payout) ────────────────────────────────────── */

/**
 * Payout state of a referred order:
 * - pending:   order not delivered yet
 * - to_pay:    delivered, referrer not paid yet
 * - paid:      admin marked the cash payout done
 * - cancelled: order cancelled - no payout
 */
export type ReferralPayoutStatus = 'pending' | 'to_pay' | 'paid' | 'cancelled';

function referralPayoutStatus(status: OrderStatus, paidAt: unknown): ReferralPayoutStatus {
  if (paidAt) return 'paid';
  if (status === 'cancelled') return 'cancelled';
  if (status === 'delivered') return 'to_pay';
  return 'pending';
}

export interface ReferrerReferral {
  orderId: string;
  createdAt: string;
  friendFirstName: string;
  payoutStatus: ReferralPayoutStatus;
  payoutAmount?: number;
}

/** Orders placed with this user's referral code, newest first (customer's Refer & Earn page). */
export async function getReferralsForReferrer(userId: string, limit: number = 100): Promise<ReferrerReferral[]> {
  const sql = getUnpooledClient();
  try {
    const result = await sql`
      SELECT id, created_at, customer_name, status, referral_paid_at, referral_payout_amount
      FROM orders
      WHERE referrer_user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
    return result.map((row) => ({
      orderId: row.id as string,
      createdAt: toIso(row.created_at as Date | string),
      // First name only - the referrer doesn't need the friend's full details.
      friendFirstName: String(row.customer_name ?? '').trim().split(/\s+/)[0] || '',
      payoutStatus: referralPayoutStatus(row.status as OrderStatus, row.referral_paid_at),
      payoutAmount: (row.referral_payout_amount as number | null) ?? undefined,
    }));
  } catch (error) {
    logger.error('DB', 'Failed to get referrals for referrer', { userId, error: error instanceof Error ? error.message : String(error) });
    return [];
  }
}

export interface AdminReferralRow {
  orderId: string;
  createdAt: string;
  orderStatus: OrderStatus;
  orderTotal: number;
  customerName: string;
  customerPhone: string;
  referralCode: string;
  referrerUserId: string | null;
  referrerName: string | null;
  referrerPhone: string | null;
  referrerEmail: string | null;
  payoutStatus: ReferralPayoutStatus;
  paidAt?: string;
  payoutAmount?: number;
  payoutRef?: string;
}

/** Every order placed with a referral code, newest first (admin payouts page). */
export async function getReferralOrdersForAdmin(limit: number = 500): Promise<AdminReferralRow[]> {
  const sql = getUnpooledClient();
  try {
    const result = await sql`
      SELECT o.id, o.created_at, o.status, o.total, o.customer_name, o.customer_phone,
             o.referral_code, o.referrer_user_id, o.referral_paid_at,
             o.referral_payout_amount, o.referral_payout_ref,
             u.name AS referrer_name, u.phone AS referrer_phone, u.email AS referrer_email
      FROM orders o
      LEFT JOIN users u ON u.id = o.referrer_user_id
      WHERE o.referral_code IS NOT NULL
      ORDER BY o.created_at DESC
      LIMIT ${limit}
    `;
    return result.map((row) => ({
      orderId: row.id as string,
      createdAt: toIso(row.created_at as Date | string),
      orderStatus: row.status as OrderStatus,
      orderTotal: row.total as number,
      customerName: row.customer_name as string,
      customerPhone: row.customer_phone as string,
      referralCode: row.referral_code as string,
      referrerUserId: (row.referrer_user_id as string | null) ?? null,
      referrerName: (row.referrer_name as string | null) ?? null,
      referrerPhone: (row.referrer_phone as string | null) ?? null,
      referrerEmail: (row.referrer_email as string | null) ?? null,
      payoutStatus: referralPayoutStatus(row.status as OrderStatus, row.referral_paid_at),
      paidAt: row.referral_paid_at ? toIso(row.referral_paid_at as Date | string) : undefined,
      payoutAmount: (row.referral_payout_amount as number | null) ?? undefined,
      payoutRef: (row.referral_payout_ref as string | null) ?? undefined,
    }));
  } catch (error) {
    logger.error('DB', 'Failed to get referral orders for admin', { error: error instanceof Error ? error.message : String(error) });
    return [];
  }
}

/**
 * Record that an admin paid the referrer of `orderId` in cash/UPI.
 * Only succeeds for a delivered, not-yet-paid referred order whose referrer
 * still exists - the WHERE clause makes a double-click / second admin a no-op.
 */
export async function markReferralPaid(
  orderId: string,
  adminUserId: string,
  amount: number,
  payoutRef?: string,
): Promise<{ success: true; paidAt: string } | { success: false; error: string }> {
  const sql = getClient();
  try {
    const result = await sql`
      UPDATE orders
      SET referral_paid_at = CURRENT_TIMESTAMP,
          referral_paid_by = ${adminUserId},
          referral_payout_amount = ${amount},
          referral_payout_ref = ${payoutRef || null}
      WHERE id = ${orderId}
        AND referrer_user_id IS NOT NULL
        AND status = 'delivered'
        AND referral_paid_at IS NULL
      RETURNING referral_paid_at
    `;
    if (result.length > 0) {
      return { success: true, paidAt: toIso(result[0].referral_paid_at as Date | string) };
    }

    // Explain why nothing was updated.
    const rows = await sql`SELECT status, referrer_user_id, referral_paid_at FROM orders WHERE id = ${orderId} LIMIT 1`;
    if (rows.length === 0) return { success: false, error: 'Order not found' };
    const row = rows[0];
    if (row.referral_paid_at) return { success: false, error: 'This referral has already been marked paid.' };
    if (!row.referrer_user_id) return { success: false, error: 'This order has no referrer (or the referrer account was deleted).' };
    return { success: false, error: 'The order must be delivered before the referral is paid.' };
  } catch (error) {
    logger.error('DB', 'Failed to mark referral paid', { orderId, error: error instanceof Error ? error.message : String(error) });
    return { success: false, error: 'Database error' };
  }
}

// sql client helpers are accessed via getUnpooledConnection() or the internal getClient()/getUnpooledClient()
