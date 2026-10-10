import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Order, OrderFormData, OrderItem, OrderStatus, VALID_STATUS_TRANSITIONS } from '@/types';
import { DELIVERY_ETA_MINUTES, isServiceablePincode, isValidGstin } from './service-area';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function validatePhoneNumber(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 10;
}

export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.slice(-10);
}

export function generateUUID(): string {
  // Use native crypto.randomUUID when available (Node 18+, all modern browsers)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const TOKEN_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'; // 36 chars (lookups are case-insensitive)
// 32 chars of base36 ≈ 165 bits of entropy - an unguessable capability token
// (M6). Stays lowercase so the case-insensitive status_token lookups keep working
// and pre-existing 16-char tokens remain valid. Fits the VARCHAR(32) columns.
const TOKEN_LENGTH = 32;

export function generateToken(): string {
  // Cryptographically-secure, unbiased token. globalThis.crypto is available in
  // Node 18+, the Edge runtime, and all modern browsers - the only runtimes this
  // app targets - so there is no insecure Math.random fallback.
  const rng = globalThis.crypto;
  if (!rng || typeof rng.getRandomValues !== 'function') {
    throw new Error('Secure RNG (crypto.getRandomValues) is unavailable');
  }
  // Rejection sampling removes modulo bias: 252 is the largest multiple of 36
  // that is <= 255, so bytes >= 252 are discarded rather than skewing 0..3.
  const MAX = 252;
  const out: string[] = [];
  while (out.length < TOKEN_LENGTH) {
    const bytes = new Uint8Array(TOKEN_LENGTH);
    rng.getRandomValues(bytes);
    for (let i = 0; i < bytes.length && out.length < TOKEN_LENGTH; i++) {
      if (bytes[i] < MAX) out.push(TOKEN_ALPHABET[bytes[i] % 36]);
    }
  }
  return out.join('');
}

// Allows letters (any script), combining marks, spaces, apostrophes, hyphens and
// periods so real names like O'Brien, Mary-Jane, and non-Latin names pass.
// Built via RegExp(...,'u') so the unicode flag doesn't require a higher TS target.
export const NAME_REGEX = new RegExp(String.raw`^[\p{L}\p{M}'.\-\s]{2,}$`, 'u');

// English messages for order-form errors. The API returns these; checkout
// shows the translated version of the same code (checkout.errors.<code>).
export const ORDER_FORM_ERRORS = {
  nameRequired: 'Customer name is required',
  nameTooLong: 'Name must be at most 120 characters',
  nameInvalid: 'Please enter a valid name (letters, spaces, apostrophes and hyphens only)',
  phoneInvalid: 'Please enter a valid 10-digit phone number',
  addressRequired: 'Site address is required',
  addressTooShort: 'Site address must be at least 10 characters',
  addressTooLong: 'Site address must be at most 500 characters',
  landmarkTooLong: 'Landmark must be at most 200 characters',
  pincodeInvalid: 'Please enter a valid 6-digit pincode',
  pincodeNotServed: "We don't deliver to this pincode yet - FastGet currently delivers within Mumbai",
  gstinInvalid: 'Please enter a valid 15-character GSTIN',
  deliveryTypeInvalid: 'Please select a valid delivery type',
  scheduledTimeRequired: 'Please select a delivery time',
  scheduledTimePast: 'That delivery slot has already started - please pick a later one',
} as const;

export type OrderFormErrorCode = keyof typeof ORDER_FORM_ERRORS;

export function validateOrderFormCode(data: OrderFormData): OrderFormErrorCode | null {
  // Type-guard fields first: a malformed body (missing/non-string field) must
  // produce a clean validation message, not a .trim()-of-undefined crash.
  if (typeof data?.customerName !== 'string' || !data.customerName.trim()) {
    return 'nameRequired';
  }
  const name = data.customerName.trim();
  if (name.length > 120) return 'nameTooLong';
  if (!NAME_REGEX.test(name)) return 'nameInvalid';

  if (typeof data.customerPhone !== 'string' || !validatePhoneNumber(data.customerPhone)) {
    return 'phoneInvalid';
  }

  // Validate site address
  if (typeof data.siteAddress !== 'string' || !data.siteAddress.trim()) return 'addressRequired';
  if (data.siteAddress.trim().length < 10) return 'addressTooShort';
  if (data.siteAddress.trim().length > 500) return 'addressTooLong';

  if (data.landmark !== undefined && typeof data.landmark === 'string' && data.landmark.length > 200) {
    return 'landmarkTooLong';
  }

  if (typeof data.sitePincode !== 'string' || !/^\d{6}$/.test(data.sitePincode)) return 'pincodeInvalid';
  if (!isServiceablePincode(data.sitePincode)) return 'pincodeNotServed';

  // GST details are optional - only checked when given.
  if (data.gstin !== undefined && data.gstin !== '' && !isValidGstin(String(data.gstin).trim().toUpperCase())) {
    return 'gstinInvalid';
  }

  // Whitelist deliveryType so a bad value can't reach the DB CHECK constraint.
  if (data.deliveryType !== 'urgent' && data.deliveryType !== 'scheduled') {
    return 'deliveryTypeInvalid';
  }
  if (data.deliveryType === 'scheduled') {
    if (!data.scheduledTime) return 'scheduledTimeRequired';
    const when = new Date(data.scheduledTime).getTime();
    if (Number.isNaN(when)) return 'scheduledTimeRequired';
    // Small grace so a slot picked just before it starts still goes through.
    if (when < Date.now() - 15 * 60000) return 'scheduledTimePast';
  }

  return null;
}

export function validateOrderForm(data: OrderFormData): string | null {
  const code = validateOrderFormCode(data);
  return code ? ORDER_FORM_ERRORS[code] : null;
}

/**
 * The order number customers see and quote to support, e.g. "FG-10234".
 * Orders saved before migration 027 have no order_number - they fall back to
 * the first 8 characters of the order id (what My Orders always showed).
 */
export function formatOrderNumber(order: Pick<Order, 'id' | 'orderNumber'>): string {
  return order.orderNumber
    ? `FG-${10000 + Number(order.orderNumber)}`
    : `FG-${order.id.slice(0, 8).toUpperCase()}`;
}

export function isValidStatusTransition(
  currentStatus: OrderStatus,
  newStatus: OrderStatus
): boolean {
  return VALID_STATUS_TRANSITIONS[currentStatus].includes(newStatus);
}

/**
 * Rupees paid with coins on an order. Orders don't store this separately, but
 * total = subtotal + convenience fee - discount - coins (see order-pricing.ts),
 * so it's whatever the other fields don't account for.
 */
export function orderCoinDiscount(order: Pick<Order, 'subtotal' | 'convenienceFee' | 'discount' | 'total'>): number {
  return Math.max(0, order.subtotal + order.convenienceFee - (order.discount || 0) - order.total);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Format a millisecond duration as a short human string, e.g. "1d 2h", "3h 15m", "42m". */
export function formatDuration(ms: number): string {
  const totalMinutes = Math.max(0, Math.round(ms / 60000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  // Always show minutes when nothing bigger is shown, even if 0 (e.g. "0m").
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);

  // Cap at two units so "1d 2h 5m" reads as "1d 2h" rather than getting noisy.
  return parts.slice(0, 2).join(' ');
}

/** Latest delivery time for an urgent order placed now, e.g. "04:35 pm". */
export function estimateDeliveryTime(): string {
  const by = new Date(Date.now() + DELIVERY_ETA_MINUTES * 60000);
  return by.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}
