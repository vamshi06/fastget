import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Order, OrderFormData, OrderItem, OrderStatus, VALID_STATUS_TRANSITIONS } from '@/types';

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
// 32 chars of base36 ≈ 165 bits of entropy — an unguessable capability token
// (M6). Stays lowercase so the case-insensitive status_token lookups keep working
// and pre-existing 16-char tokens remain valid. Fits the VARCHAR(32) columns.
const TOKEN_LENGTH = 32;

export function generateToken(): string {
  // Cryptographically-secure, unbiased token. globalThis.crypto is available in
  // Node 18+, the Edge runtime, and all modern browsers — the only runtimes this
  // app targets — so there is no insecure Math.random fallback.
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

export function validateOrderForm(data: OrderFormData): string | null {
  // Type-guard fields first: a malformed body (missing/non-string field) must
  // produce a clean validation message, not a .trim()-of-undefined crash.
  if (typeof data?.customerName !== 'string' || !data.customerName.trim()) {
    return 'Customer name is required';
  }
  const name = data.customerName.trim();
  if (name.length > 120) {
    return 'Name must be at most 120 characters';
  }
  if (!NAME_REGEX.test(name)) {
    return 'Please enter a valid name (letters, spaces, apostrophes and hyphens only)';
  }

  if (typeof data.customerPhone !== 'string' || !validatePhoneNumber(data.customerPhone)) {
    return 'Please enter a valid 10-digit phone number';
  }

  // Validate site address
  if (typeof data.siteAddress !== 'string' || !data.siteAddress.trim()) {
    return 'Site address is required';
  }
  if (data.siteAddress.trim().length < 10) {
    return 'Site address must be at least 10 characters';
  }
  if (data.siteAddress.trim().length > 500) {
    return 'Site address must be at most 500 characters';
  }

  if (data.landmark !== undefined && typeof data.landmark === 'string' && data.landmark.length > 200) {
    return 'Landmark must be at most 200 characters';
  }

  // Whitelist deliveryType so a bad value can't reach the DB CHECK constraint.
  if (data.deliveryType !== 'urgent' && data.deliveryType !== 'scheduled') {
    return 'Please select a valid delivery type';
  }
  if (data.deliveryType === 'scheduled' && !data.scheduledTime) {
    return 'Please select a delivery time';
  }

  return null;
}

export function isValidStatusTransition(
  currentStatus: OrderStatus,
  newStatus: OrderStatus
): boolean {
  return VALID_STATUS_TRANSITIONS[currentStatus].includes(newStatus);
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

export function estimateDeliveryTime(): string {
  const now = new Date();
  const minMinutes = 30;
  const maxMinutes = 60;
  
  const minDelivery = new Date(now.getTime() + minMinutes * 60000);
  const maxDelivery = new Date(now.getTime() + maxMinutes * 60000);
  
  return `${minDelivery.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} - ${maxDelivery.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
}
