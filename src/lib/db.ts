import { neon } from '@neondatabase/serverless';
import { timingSafeEqual } from 'crypto';
import { Order, OrderItem, OrderStatus, VALID_STATUS_TRANSITIONS } from '@/types';
import { logger } from '@/lib/logger';

/**
 * Neon Postgres database client and order CRUD operations
 *
 * Environment:
 * - DATABASE_URL or fastget_DATABASE_URL: Neon connection string (required)
 * - AGENT_PIN: 4-digit PIN for agent authentication (required for status updates)
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

// PIN constant for agent verification (4-digit) – loaded at module init
const AGENT_PIN = process.env.AGENT_PIN;

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
  total: number;
  payment_method: string;
  status: OrderStatus;
  eta: string | null;
  status_token: string;
  update_token: string;
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
        user_id UUID
      )
    `;

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

    await sql`CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_products_status ON products(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC)`;

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
 */
export async function initializeWishlistsTable(): Promise<void> {
  const sql = getClient();
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS wishlists (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        variant_id UUID NOT NULL,
        added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_wishlists_user_id
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_wishlists_variant_id
          FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
        CONSTRAINT uk_wishlists_user_variant
          UNIQUE (user_id, variant_id)
      )
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_wishlists_user_id ON wishlists(user_id)`;

    logger.info('DB', 'Wishlists table initialized successfully');
  } catch (error) {
    logger.error('DB', 'Failed to initialize wishlists table', { error: error instanceof Error ? error.message : String(error) });
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
    
    // Orders table (with user_id support)
    await initializeDatabase();
    await addUserIdToOrders();
    
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
  try {
    await sql`
      INSERT INTO orders (
        id, created_at, customer_name, customer_phone, site_address, landmark,
        delivery_type, scheduled_time, items, subtotal, convenience_fee, total,
        payment_method, status, eta, status_token, update_token
      ) VALUES (
        ${order.id}, ${order.createdAt}, ${order.customerName}, ${order.customerPhone},
        ${order.siteAddress}, ${order.landmark || null}, ${order.deliveryType},
        ${order.scheduledTime || null}, ${JSON.stringify(order.items)}, ${order.subtotal},
        ${order.convenienceFee}, ${order.total}, ${order.paymentMethod}, ${order.status},
        ${order.eta || null}, ${order.statusToken}, ${order.updateToken}
      )
    `;
    logger.info('DB', 'Order created successfully', { orderId: order.id });
    return true;
  } catch (error) {
    logger.error('DB', 'Failed to create order', {
      orderId: order.id,
      error: error instanceof Error ? error.message : String(error),
    });

    // If table doesn't exist, try to initialize it once
    if (error instanceof Error && error.message.includes('relation "orders" does not exist')) {
      logger.warn('DB', 'Orders table missing — attempting auto-init');
      try {
        await initializeDatabase();
        logger.info('DB', 'DB auto-init succeeded, retrying order creation');
        // Retry the insert
        await sql`
          INSERT INTO orders (
            id, created_at, customer_name, customer_phone, site_address, landmark,
            delivery_type, scheduled_time, items, subtotal, convenience_fee, total,
            payment_method, status, eta, status_token, update_token
          ) VALUES (
            ${order.id}, ${order.createdAt}, ${order.customerName}, ${order.customerPhone},
            ${order.siteAddress}, ${order.landmark || null}, ${order.deliveryType},
            ${order.scheduledTime || null}, ${JSON.stringify(order.items)}, ${order.subtotal},
            ${order.convenienceFee}, ${order.total}, ${order.paymentMethod}, ${order.status},
            ${order.eta || null}, ${order.statusToken}, ${order.updateToken}
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
 * Retrieve an order by its update token (agent-facing).
 *
 * @param {string} token - The update_token from order creation response
 * @returns {Promise<Order | null>}
 */
export async function getOrderByUpdateToken(token: string): Promise<Order | null> {
  const sql = getUnpooledClient();
  try {
    const normalizedToken = token.toLowerCase();

    const result = await sql`
      SELECT * FROM orders WHERE LOWER(update_token) = ${normalizedToken} LIMIT 1
    `;

    if (result.length === 0) {
      return null;
    }

    const dbRow = result[0] as DbOrder;
    return dbOrderToOrder(dbRow);
  } catch (error) {
    logger.error('DB', 'Failed to get order by update token', { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

/**
 * Update an order's status with PIN authentication and transition validation.
 *
 * @param {string} updateToken
 * @param {OrderStatus} newStatus
 * @param {string} pin
 * @param {string} [eta]
 * @returns {Promise<{success: boolean, error?: string, orderId?: string}>}
 */
export async function updateOrderStatus(
  updateToken: string,
  newStatus: OrderStatus,
  pin: string,
  eta?: string
): Promise<{ success: boolean; error?: string; orderId?: string }> {
  try {
    // Verify PIN is configured
    if (!AGENT_PIN) {
      logger.error('DB', 'AGENT_PIN env var not configured — status updates blocked');
      return { success: false, error: 'Authentication not configured' };
    }

    // Verify PIN using constant-time comparison to prevent timing attacks
    const pinMatch =
      pin.length === AGENT_PIN.length &&
      timingSafeEqual(Buffer.from(pin), Buffer.from(AGENT_PIN));
    if (!pinMatch) {
      return { success: false, error: 'Invalid PIN' };
    }

    const normalizedUpdateToken = updateToken.toLowerCase();

    // Fetch current order to validate transition
    const currentOrder = await getOrderByUpdateToken(normalizedUpdateToken);

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

    let result;
    if (eta) {
      result = await sqlConn`
        UPDATE orders
        SET status = ${newStatus}, eta = ${eta}
        WHERE LOWER(update_token) = ${normalizedUpdateToken} AND status = ${currentOrder.status}
        RETURNING id
      `;
    } else {
      result = await sqlConn`
        UPDATE orders
        SET status = ${newStatus}
        WHERE LOWER(update_token) = ${normalizedUpdateToken} AND status = ${currentOrder.status}
        RETURNING id
      `;
    }

    // If no rows updated, a race condition changed the status
    if (result.length === 0) {
      return { success: false, error: 'Order status changed by another agent. Please refresh.' };
    }

    return { success: true, orderId: currentOrder.id };
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
    total: dbOrder.total,
    paymentMethod: dbOrder.payment_method as 'cod',
    status: dbOrder.status,
    eta: dbOrder.eta || undefined,
    statusToken: dbOrder.status_token,
    updateToken: dbOrder.update_token,
  };
}

// sql client helpers are accessed via getUnpooledConnection() or the internal getClient()/getUnpooledClient()
