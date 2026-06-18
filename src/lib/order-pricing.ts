import { OrderItem } from '@/types';
import { getTrustedUnitPrices } from '@/lib/products';
import { logger } from '@/lib/logger';

/**
 * Server-side order pricing (H1).
 *
 * Recomputes line items and totals from the trusted catalog, ignoring any
 * client-supplied prices/totals. This is the single source of truth used by
 * both the COD (/api/orders) and Razorpay (/api/payment/create-order) flows, so
 * the amount charged can never be tampered with from the browser.
 */

// Must stay in sync with CartContext.CONVENIENCE_FEE_PERCENTAGE (client display).
export const CONVENIENCE_FEE_PERCENTAGE = 10;

const MAX_QTY_PER_ITEM = 1000;

export interface IncomingCartItem {
  product?: { id?: unknown; name?: unknown; price?: unknown };
  quantity?: unknown;
}

export interface PricedOrder {
  items: OrderItem[]; // line items with server-authoritative unit prices (rupees)
  subtotal: number; // rupees
  convenienceFee: number; // rupees
  total: number; // rupees
}

export type PriceResult =
  | { ok: true; priced: PricedOrder }
  | { ok: false; status: number; error: string };

/**
 * Price an order from the catalog.
 *
 * @param rawItems    cart items as received from the client (only id + quantity
 *                    are trusted; the client price is ignored)
 * @param clientTotal optional total the client computed — if it disagrees with
 *                    the server total the order is rejected (tampered or stale
 *                    cart), so a customer is never charged a price they didn't see
 */
export async function priceOrderFromCatalog(
  rawItems: unknown,
  clientTotal?: number,
): Promise<PriceResult> {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return { ok: false, status: 400, error: 'Cart is empty' };
  }

  const normalised: { code: string; name: string; quantity: number }[] = [];
  for (const it of rawItems as IncomingCartItem[]) {
    const code = typeof it?.product?.id === 'string' ? it.product.id : '';
    const name = typeof it?.product?.name === 'string' ? it.product.name : '';
    const quantity = Number(it?.quantity);
    if (!code) {
      return { ok: false, status: 400, error: 'Invalid cart item' };
    }
    if (!Number.isInteger(quantity) || quantity <= 0 || quantity > MAX_QTY_PER_ITEM) {
      return { ok: false, status: 400, error: 'Invalid item quantity' };
    }
    normalised.push({ code, name, quantity });
  }

  const prices = await getTrustedUnitPrices(normalised.map((i) => i.code));

  const items: OrderItem[] = [];
  let subtotal = 0;
  for (const i of normalised) {
    const unit = prices.get(i.code);
    if (unit === undefined) {
      return { ok: false, status: 400, error: `Product is no longer available: ${i.code}` };
    }
    subtotal += unit * i.quantity;
    items.push({ sku: i.code, name: i.name, quantity: i.quantity, price: unit });
  }

  const convenienceFee = Math.round(subtotal * (CONVENIENCE_FEE_PERCENTAGE / 100));
  const total = subtotal + convenienceFee;

  if (total <= 0) {
    return { ok: false, status: 400, error: 'Invalid order total' };
  }

  if (typeof clientTotal === 'number' && Math.round(clientTotal) !== total) {
    logger.warn('Pricing', 'Client total mismatch — rejecting order', {
      clientTotal,
      serverTotal: total,
    });
    return {
      ok: false,
      status: 409,
      error: 'Cart prices have changed. Please review your cart and try again.',
    };
  }

  return { ok: true, priced: { items, subtotal, convenienceFee, total } };
}
