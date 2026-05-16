import { neon } from '@neondatabase/serverless';
import { Order, OrderItem, OrderStatus, VALID_STATUS_TRANSITIONS } from '@/types';

// Support both plain DATABASE_URL and Vercel-prefixed version (fastget_DATABASE_URL)
const databaseUrl = process.env.DATABASE_URL || process.env.fastget_DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required but not set (checked DATABASE_URL, fastget_DATABASE_URL)');
}

const sql = neon(databaseUrl);

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

export async function initializeDatabase(): Promise<void> {
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

export async function createOrder(order: Order): Promise<boolean> {
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

export async function getOrderByStatusToken(token: string): Promise<Order | null> {
  try {
    const result = await sql`
      SELECT * FROM orders WHERE status_token = ${token} LIMIT 1
    `;
    
    if (result.length === 0) {
      return null;
    }
    
    return dbOrderToOrder(result[0] as DbOrder);
  } catch (error) {
    console.error('Failed to get order:', error);
    return null;
  }
}

export async function getOrderByUpdateToken(token: string): Promise<Order | null> {
  try {
    const result = await sql`
      SELECT * FROM orders WHERE update_token = ${token} LIMIT 1
    `;
    
    if (result.length === 0) {
      return null;
    }
    
    return dbOrderToOrder(result[0] as DbOrder);
  } catch (error) {
    console.error('Failed to get order by update token:', error);
    return null;
  }
}

// PIN constant for agent verification (4-digit)
const AGENT_PIN = process.env.AGENT_PIN;

export async function updateOrderStatus(
  updateToken: string,
  newStatus: OrderStatus,
  pin: string,
  eta?: string
): Promise<{ success: boolean; error?: string }> {
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
    
    // Fetch the current order to validate transition and protect against races
    const currentOrder = await getOrderByUpdateToken(updateToken);
    if (!currentOrder) {
      return { success: false, error: 'Order not found' };
    }
    
    // Validate status transition
    const validTransitions = VALID_STATUS_TRANSITIONS[currentOrder.status];
    if (!validTransitions.includes(newStatus)) {
      return { 
        success: false, 
        error: `Cannot transition from ${currentOrder.status} to ${newStatus}` 
      };
    }
    
    // Use separate safe queries with current status check for race condition protection
    let result;
    if (eta) {
      result = await sql`
        UPDATE orders 
        SET status = ${newStatus}, eta = ${eta}
        WHERE update_token = ${updateToken} AND status = ${currentOrder.status}
        RETURNING id
      `;
    } else {
      result = await sql`
        UPDATE orders 
        SET status = ${newStatus}
        WHERE update_token = ${updateToken} AND status = ${currentOrder.status}
        RETURNING id
      `;
    }
    
    // If no rows updated, another agent may have changed the status (race condition)
    if (result.length === 0) {
      return { success: false, error: 'Order status changed by another agent. Please refresh.' };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Failed to update order status:', error);
    return { success: false, error: 'Database error' };
  }
}

export async function getRecentOrders(limit: number = 50): Promise<Order[]> {
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

export async function getOrdersByStatus(status: OrderStatus): Promise<Order[]> {
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

function dbOrderToOrder(dbOrder: DbOrder): Order {
  return {
    id: dbOrder.id,
    createdAt: dbOrder.created_at.toISOString(),
    customerName: dbOrder.customer_name,
    customerPhone: dbOrder.customer_phone,
    siteAddress: dbOrder.site_address,
    landmark: dbOrder.landmark || undefined,
    deliveryType: dbOrder.delivery_type,
    scheduledTime: dbOrder.scheduled_time?.toISOString(),
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

export { sql };
