import { Order, OrderItem, OrderStatus, Product, CategoryId } from '@/types';

const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL || '';
const APPS_SCRIPT_SECRET = process.env.APPS_SCRIPT_SECRET || '';

interface SheetsOrderRow {
  id: string;
  created_at: string;
  customer_name: string;
  customer_phone: string;
  site_address: string;
  landmark: string;
  delivery_type: string;
  scheduled_time: string;
  items: string;
  subtotal: number;
  convenience_fee: number;
  total: number;
  payment_method: string;
  status: string;
  eta: string;
  status_token: string;
  update_token: string;
}

interface SheetsProductRow {
  id: string;
  name: string;
  description: string;
  price: number;
  unit: string;
  category: string;
  image_url: string;
  stock_status: string;
  created_at: string;
}

export async function createOrderInSheets(order: Order): Promise<boolean> {
  if (!GOOGLE_SCRIPT_URL) {
    console.error('GOOGLE_SCRIPT_URL is not configured; order was not saved');
    return false;
  }

  try {
    const row: SheetsOrderRow = {
      id: order.id,
      created_at: order.createdAt,
      customer_name: order.customerName,
      customer_phone: order.customerPhone,
      site_address: order.siteAddress,
      landmark: order.landmark || '',
      delivery_type: order.deliveryType,
      scheduled_time: order.scheduledTime || '',
      items: JSON.stringify(order.items),
      subtotal: order.subtotal,
      convenience_fee: order.convenienceFee,
      total: order.total,
      payment_method: order.paymentMethod,
      status: order.status,
      eta: order.eta || '',
      status_token: order.statusToken,
      update_token: order.updateToken,
    };

    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
        ...(APPS_SCRIPT_SECRET && { 'X-Secret': APPS_SCRIPT_SECRET }),
      },
      body: JSON.stringify({
        action: 'createOrder',
        secret: APPS_SCRIPT_SECRET || undefined,
        data: row,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.success === true;
  } catch (error) {
    console.error('Failed to create order in Sheets:', error);
    return false;
  }
}

export async function getOrderFromSheets(token: string): Promise<Order | null> {
  if (!GOOGLE_SCRIPT_URL) {
    console.warn('GOOGLE_SCRIPT_URL not configured');
    return null;
  }

  try {
    const url = new URL(GOOGLE_SCRIPT_URL);
    url.searchParams.set('action', 'getOrder');
    url.searchParams.set('token', token);
    if (APPS_SCRIPT_SECRET) {
      url.searchParams.set('secret', APPS_SCRIPT_SECRET);
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(APPS_SCRIPT_SECRET && { 'X-Secret': APPS_SCRIPT_SECRET }),
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.success || !result.data) {
      return null;
    }

    return sheetsRowToOrder(result.data);
  } catch (error) {
    console.error('Failed to get order from Sheets:', error);
    return null;
  }
}

export async function getAllOrdersFromSheets(): Promise<Order[]> {
  if (!GOOGLE_SCRIPT_URL) {
    console.warn('GOOGLE_SCRIPT_URL not configured');
    return [];
  }

  try {
    const url = new URL(GOOGLE_SCRIPT_URL);
    url.searchParams.set('action', 'getAllOrders');
    if (APPS_SCRIPT_SECRET) {
      url.searchParams.set('secret', APPS_SCRIPT_SECRET);
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(APPS_SCRIPT_SECRET && { 'X-Secret': APPS_SCRIPT_SECRET }),
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success || !Array.isArray(result.data)) {
      return [];
    }

    return result.data.map(sheetsRowToOrder);
  } catch (error) {
    console.error('Failed to fetch all orders from Sheets:', error);
    return [];
  }
}

export async function updateOrderStatusInSheets(
  updateToken: string,
  newStatus: OrderStatus,
  pin: string,
  eta?: string
): Promise<{ success: boolean; error?: string }> {
  if (!GOOGLE_SCRIPT_URL) {
    console.warn('GOOGLE_SCRIPT_URL not configured');
    return { success: false, error: 'Service temporarily unavailable' };
  }

  try {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
        ...(APPS_SCRIPT_SECRET && { 'X-Secret': APPS_SCRIPT_SECRET }),
      },
      body: JSON.stringify({
        action: 'updateStatus',
        secret: APPS_SCRIPT_SECRET || undefined,
        data: {
          update_token: updateToken,
          status: newStatus,
          pin,
          eta,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return {
      success: result.success === true,
      error: result.error,
    };
  } catch (error) {
    console.error('Failed to update order status:', error);
    return { success: false, error: 'Service temporarily unavailable' };
  }
}

function sheetsRowToOrder(row: SheetsOrderRow): Order {
  return {
    id: row.id,
    createdAt: row.created_at,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    siteAddress: row.site_address,
    landmark: row.landmark || undefined,
    deliveryType: row.delivery_type as Order['deliveryType'],
    scheduledTime: row.scheduled_time || undefined,
    items: JSON.parse(row.items) as OrderItem[],
    subtotal: row.subtotal,
    convenienceFee: row.convenience_fee,
    total: row.total,
    paymentMethod: row.payment_method as Order['paymentMethod'],
    status: row.status as OrderStatus,
    eta: row.eta || undefined,
    statusToken: row.status_token,
    updateToken: row.update_token,
  };
}

export async function getAllProductsFromSheets(): Promise<Product[]> {
  if (!GOOGLE_SCRIPT_URL) {
    console.warn('GOOGLE_SCRIPT_URL not configured');
    return [];
  }

  try {
    const url = new URL(GOOGLE_SCRIPT_URL);
    url.searchParams.set('action', 'getAllProducts');
    if (APPS_SCRIPT_SECRET) {
      url.searchParams.set('secret', APPS_SCRIPT_SECRET);
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(APPS_SCRIPT_SECRET && { 'X-Secret': APPS_SCRIPT_SECRET }),
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success || !Array.isArray(result.data)) {
      return [];
    }

    return result.data.map(sheetsRowToProduct);
  } catch (error) {
    console.error('Failed to fetch all products from Sheets:', error);
    return [];
  }
}

export async function createProductInSheets(product: Product): Promise<boolean> {
  if (!GOOGLE_SCRIPT_URL) {
    console.error('GOOGLE_SCRIPT_URL is not configured');
    return false;
  }

  try {
    const row: SheetsProductRow = {
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      unit: product.unit,
      category: product.category,
      image_url: product.imageUrl || '',
      stock_status: product.stockStatus,
      created_at: new Date().toISOString(),
    };

    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
        ...(APPS_SCRIPT_SECRET && { 'X-Secret': APPS_SCRIPT_SECRET }),
      },
      body: JSON.stringify({
        action: 'createProduct',
        secret: APPS_SCRIPT_SECRET || undefined,
        data: row,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.success === true;
  } catch (error) {
    console.error('Failed to create product in Sheets:', error);
    return false;
  }
}

function sheetsRowToProduct(row: SheetsProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: row.price,
    unit: row.unit,
    category: row.category as CategoryId,
    imageUrl: row.image_url || undefined,
    stockStatus: row.stock_status as 'in_stock' | 'low' | 'out',
  };
}
