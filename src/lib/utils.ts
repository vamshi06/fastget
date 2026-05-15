import { Order, OrderFormData, OrderItem, OrderStatus, VALID_STATUS_TRANSITIONS } from '@/types';

export function validatePhoneNumber(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 10;
}

export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.slice(-10);
}

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function generateToken(): string {
  return Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 36).toString(36)
  ).join('');
}

export function generatePin(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export function hashPin(pin: string): string {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

export function validateOrderForm(data: OrderFormData): string | null {
  if (!data.customerName.trim()) {
    return 'Customer name is required';
  }
  
  if (!validatePhoneNumber(data.customerPhone)) {
    return 'Please enter a valid 10-digit phone number';
  }
  
  if (!data.siteAddress.trim()) {
    return 'Site address is required';
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

export function estimateDeliveryTime(area?: string): string {
  const now = new Date();
  const minMinutes = 30;
  const maxMinutes = 60;
  
  const minDelivery = new Date(now.getTime() + minMinutes * 60000);
  const maxDelivery = new Date(now.getTime() + maxMinutes * 60000);
  
  return `${minDelivery.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} - ${maxDelivery.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
}
