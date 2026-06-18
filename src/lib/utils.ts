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

export function validateOrderForm(data: OrderFormData): string | null {
  // Validate customer name
  const nameRegex = /^[a-zA-Z\s]{3,}$/;
  if (!data.customerName.trim()) {
    return 'Customer name is required';
  }
  if (!nameRegex.test(data.customerName.trim())) {
    return 'Name must be at least 3 characters and contain only letters and spaces';
  }
  
  if (!validatePhoneNumber(data.customerPhone)) {
    return 'Please enter a valid 10-digit phone number';
  }
  
  // Validate site address
  if (!data.siteAddress.trim()) {
    return 'Site address is required';
  }
  if (data.siteAddress.trim().length < 10) {
    return 'Site address must be at least 10 characters';
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

export function estimateDeliveryTime(): string {
  const now = new Date();
  const minMinutes = 30;
  const maxMinutes = 60;
  
  const minDelivery = new Date(now.getTime() + minMinutes * 60000);
  const maxDelivery = new Date(now.getTime() + maxMinutes * 60000);
  
  return `${minDelivery.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} - ${maxDelivery.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
}
