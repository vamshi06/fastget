export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  unit: string;
  category: CategoryId;
  imageUrl?: string;
  stockStatus: 'in_stock' | 'low' | 'out';
}

export type CategoryId = 
  | 'carpentry'
  | 'plumbing'
  | 'hardware'
  | 'electrical'
  | 'adhesives';

export interface Category {
  id: CategoryId;
  name: string;
  description: string;
  icon: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export type OrderStatus = 
  | 'received'
  | 'eta_assigned'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export type DeliveryType = 'urgent' | 'scheduled';
export type PaymentMethod = 'cod';

export interface OrderItem {
  sku: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  siteAddress: string;
  landmark?: string;
  deliveryType: DeliveryType;
  scheduledTime?: string;
  items: OrderItem[];
  subtotal: number;
  convenienceFee: number;
  total: number;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  eta?: string;
  statusToken: string;
  updateToken: string;
}

export interface OrderFormData {
  customerName: string;
  customerPhone: string;
  siteAddress: string;
  landmark?: string;
  deliveryType: DeliveryType;
  scheduledTime?: string;
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  received: 'Order Received',
  eta_assigned: 'ETA Assigned',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export const ORDER_STATUS_DESCRIPTIONS: Record<OrderStatus, string> = {
  received: 'We have received your order and will confirm availability shortly.',
  eta_assigned: 'Your order is confirmed. We will deliver within the estimated time.',
  out_for_delivery: 'Your order is on the way to your site.',
  delivered: 'Your order has been delivered successfully.',
  cancelled: 'This order has been cancelled.',
};

export const VALID_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  received: ['eta_assigned', 'cancelled'],
  eta_assigned: ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};
