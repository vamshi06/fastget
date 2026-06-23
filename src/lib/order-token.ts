import crypto from 'crypto';
import { OrderItem } from '@/types';

export interface OrderTokenData {
  razorpayOrderId: string;
  customerName: string;
  customerPhone: string;
  siteAddress: string;
  landmark?: string;
  deliveryType: 'urgent' | 'scheduled';
  scheduledTime?: string;
  items: OrderItem[];
  subtotal: number;
  convenienceFee: number;
  total: number;
  userId?: string;
  expiresAt: number;
}

const EXPIRY_MS = 30 * 60 * 1000;

function secret(): string {
  const s = process.env.RAZORPAY_KEY_SECRET;
  if (!s) throw new Error('RAZORPAY_KEY_SECRET not configured');
  return s;
}

export function createOrderToken(data: Omit<OrderTokenData, 'expiresAt'>): string {
  const payload = Buffer.from(
    JSON.stringify({ ...data, expiresAt: Date.now() + EXPIRY_MS })
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', secret()).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

export function verifyOrderToken(token: string): OrderTokenData | null {
  const dot = token.lastIndexOf('.');
  if (dot === -1) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  let expected: Buffer;
  try {
    expected = Buffer.from(
      crypto.createHmac('sha256', secret()).update(payload).digest('hex'),
      'hex'
    );
  } catch {
    return null;
  }

  let incoming: Buffer;
  try {
    incoming = Buffer.from(sig, 'hex');
  } catch {
    return null;
  }

  if (incoming.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(incoming, expected)) return null;

  let data: OrderTokenData;
  try {
    data = JSON.parse(Buffer.from(payload, 'base64url').toString()) as OrderTokenData;
  } catch {
    return null;
  }

  if (data.expiresAt < Date.now()) return null;
  return data;
}
