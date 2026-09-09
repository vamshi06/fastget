export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;       // in rupees for display
  unit: string;
  category: CategoryId;
  categoryName?: string; // human-readable category name from DB
  imageUrl?: string;
  stockStatus: 'in_stock' | 'low' | 'out';
  stockQuantity?: number;            // actual count, populated by admin/catalog queries
  // Extended fields populated when fetching from the live DB
  brand?: string;
  productCode?: string; // stable identifier from the Google Sheet (e.g. "PLY-CP-04")
  sku?: string;
  variantId?: string;
  mrpPrice?: number;   // in rupees
  moq?: number;
  variantCount?: number;
  // Flash-sale fields — populated when a limited-time sale_price is active
  isFlashSale?: boolean;
  saleEndsAt?: string; // ISO timestamp
  // `price` above is already the discounted sale price when isFlashSale is
  // true. saleOriginalPriceRupees carries the pre-discount price so the cart
  // can fall back to it when saleMinOrderRupees isn't met.
  saleOriginalPriceRupees?: number;
  saleMinOrderRupees?: number; // cart must reach this (at original prices) to unlock the sale price
}

export type CategoryId =
  // Table-level slugs (canonical, one per category table)
  | 'carpentry'
  | 'paints_and_polish'
  | 'plumbing'
  | 'civil_materials'
  | 'electrical'
  | 'flooring_and_ceilings'
  | 'glass_and_aluminium'
  | 'tools_and_machines'
  // Hyphenated aliases accepted in URL params / legacy data
  | 'paints'
  | 'civil-materials'
  | 'flooring-ceilings'
  | 'glass-aluminium'
  | 'tools-machines'
  // Legacy mock-data values (no longer used in live app)
  | 'hardware'
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
export type PaymentMethod = 'cod' | 'razorpay';

export interface OrderItem {
  sku: string;
  name: string;
  quantity: number;
  price: number;
}

/** One entry in an order's status timeline — when it entered a given status. */
export interface StatusHistoryEntry {
  status: OrderStatus;
  timestamp: string; // ISO 8601
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
  paymentStatus?: string | null;
  status: OrderStatus;
  eta?: string;
  statusToken: string;
  updateToken: string;
  userId?: string;
  // Timeline of status changes, oldest first (e.g. received -> eta_assigned -> ...).
  // Populated by the DB layer (createOrder seeds it, updateOrderStatus appends to
  // it) — undefined only on an in-memory Order built just before its first save.
  statusHistory?: StatusHistoryEntry[];
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

// ============================================================================
// Phase 1: User Management
// ============================================================================

export type UserRole = 'customer' | 'agent' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash?: string;
  phone: string;
  role: UserRole;
  preferredAddressId?: string;
  lastOrderAt?: string;
  createdAt: string;
  updatedAt: string;
  emailVerified?: boolean;
  emailVerifiedAt?: string;
  telegramChatId?: string;
}

export type AddressType = 'home' | 'work' | 'other';

export interface UserAddress {
  id: string;
  userId: string;
  type: AddressType;
  street: string;
  landmark?: string;
  city: string;
  phone: string;
  isPrimary: boolean;
  createdAt: string;
}

// ============================================================================
// Phase 2: Product Catalog
// ============================================================================

export interface CategoryDB {
  id: string;
  name: string;
  slug: string;
  description?: string;
  createdAt: string;
}

export interface ProductDB {
  id: string;
  name: string;
  description?: string;
  categoryId?: string;
  price: number; // in paise (1 rupee = 100 paise)
  status: 'active' | 'inactive' | 'discontinued';
  createdAt: string;
  updatedAt: string;
}

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  priceOverride?: number; // in paise, overrides product base price if set
  stockQuantity: number;
  attributes: Record<string, string>; // e.g., { "size": "M", "color": "red" }
  createdAt: string;
}

// ============================================================================
// Phase 4: User Preferences
// ============================================================================

export interface WishlistItem {
  id: string;
  userId: string;
  productId: string;
  productData: Product;
  addedAt: string;
}
