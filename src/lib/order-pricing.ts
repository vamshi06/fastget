import { OrderItem } from '@/types';
import { getTrustedPricingInfo } from '@/lib/products';
import { logger } from '@/lib/logger';

/**
 * Server-side order pricing (H1).
 *
 * Recomputes line items and totals from the trusted catalog, ignoring any
 * client-supplied prices/totals. This is the single source of truth used by
 * both the COD (/api/orders) and Razorpay (/api/payment/create-order) flows, so
 * the amount charged can never be tampered with from the browser.
 */

// Convenience fee has been removed — total equals subtotal. Kept at 0 (rather
// than deleting the field) so the `convenience_fee` DB column, order types,
// and API payloads don't need a schema migration.
// Must stay in sync with CartContext.CONVENIENCE_FEE_PERCENTAGE (client display).
export const CONVENIENCE_FEE_PERCENTAGE = 0;

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

  const pricing = await getTrustedPricingInfo(normalised.map((i) => i.code));

  // Pass 1: each line's ORIGINAL (pre-discount) contribution, plus their sum.
  // A flash sale's minimum-order threshold is checked against the OTHER items
  // in the cart — not the sale item's own price — so "min order ₹100" means
  // "₹100 of other products", not "₹100 including the ₹1 item itself".
  let originalSubtotal = 0;
  const originalLineTotals = new Map<string, number>(); // code -> original unit*qty (rupees)
  for (const i of normalised) {
    const info = pricing.get(i.code);
    if (info === undefined) {
      return { ok: false, status: 400, error: `Product is no longer available: ${i.code}` };
    }
    const lineTotal = Math.round(info.originalPaise / 100) * i.quantity;
    originalSubtotal += lineTotal;
    originalLineTotals.set(i.code, (originalLineTotals.get(i.code) ?? 0) + lineTotal);
  }

  // Pass 2: price each line, applying the sale price only where it's earned.
  const items: OrderItem[] = [];
  let subtotal = 0;
  for (const i of normalised) {
    const info = pricing.get(i.code)!;
    const originalUnit = Math.round(info.originalPaise / 100);
    const saleUnit = info.salePaise != null ? Math.round(info.salePaise / 100) : null;
    const minOrder = info.minOrderPaise != null ? Math.round(info.minOrderPaise / 100) : null;
    const otherItemsSubtotal = originalSubtotal - (originalLineTotals.get(i.code) ?? 0);
    const saleEligible =
      info.saleActive && saleUnit != null && (minOrder == null || otherItemsSubtotal >= minOrder);
    const unit = saleEligible ? saleUnit! : originalUnit;
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
