import { Order, OrderItem, OrderFormData, OrderStatus } from '@/types';

const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL || '';

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

export async function createOrderInSheets(order: Order): Promise<boolean> {
  if (!GOOGLE_SCRIPT_URL) {
    console.warn('GOOGLE_SCRIPT_URL not configured, logging order locally');
    console.log('Order:', order);
    return true;
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
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'createOrder',
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
    const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getOrder&token=${token}`, {
      method: 'GET',
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
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'updateStatus',
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
