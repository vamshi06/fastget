import { neon } from '@neondatabase/serverless';
import { Order, OrderItem, OrderStatus, VALID_STATUS_TRANSITIONS } from '@/types';

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
        update_token VARCHAR(32) UNIQUE NOT NULL
      )
    `;

    // Create indexes for faster lookups
    await sql`CREATE INDEX IF NOT EXISTS idx_orders_status_token ON orders(status_token)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_orders_update_token ON orders(update_token)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC)`;

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
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
    return true;
  } catch (error) {
    console.error('Failed to create order:', error);
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
    console.error('Failed to get order by status token:', error);
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
    console.error('Failed to get order by update token:', error);
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
      console.error('AGENT_PIN not configured');
      return { success: false, error: 'Authentication not configured' };
    }

    // Verify PIN
    if (pin !== AGENT_PIN) {
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
    console.error('Failed to update order status:', error);
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
    console.error('Failed to get recent orders:', error);
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
    console.error('Failed to get orders by status:', error);
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
