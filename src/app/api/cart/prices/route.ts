import { NextRequest, NextResponse } from 'next/server';
import { getTrustedPricingInfo } from '@/lib/products';
import { logger } from '@/lib/logger';

const MAX_IDS = 300; // matches /api/cart MAX_CART_ITEMS

/**
 * Current pricing for the products in a cart.
 *
 * Cart items store a product snapshot taken when they were added, so its
 * prices go stale when the catalog (or a flash sale) changes — the cart then
 * shows one price and checkout charges another. The cart calls this to
 * refresh those snapshots. Reads the same source as order-pricing
 * (getTrustedPricingInfo), so the cart always agrees with what checkout charges.
 *
 * Public (no session) — it only exposes catalog prices.
 */
export async function GET(request: NextRequest) {
  const start = Date.now();
  const ids = (request.nextUrl.searchParams.get('ids') ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, MAX_IDS);

  if (ids.length === 0) {
    return NextResponse.json({ prices: {} });
  }

  try {
    const pricing = await getTrustedPricingInfo(ids);
    const prices: Record<string, {
      price: number;
      isFlashSale: boolean;
      saleOriginalPriceRupees?: number;
      saleMinOrderRupees?: number;
    }> = {};

    // Same paise → rupee rounding as order-pricing.priceOrderFromCatalog.
    pricing.forEach((info, code) => {
      const saleActive = info.saleActive && info.salePaise != null;
      const original = Math.round(info.originalPaise / 100);
      prices[code] = {
        price: saleActive ? Math.round(info.salePaise! / 100) : original,
        isFlashSale: saleActive,
        saleOriginalPriceRupees: saleActive ? original : undefined,
        saleMinOrderRupees: saleActive && info.minOrderPaise != null
          ? Math.round(info.minOrderPaise / 100)
          : undefined,
      };
    });

    logger.api('GET', '/api/cart/prices', 200, Date.now() - start);
    return NextResponse.json({ prices }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    logger.error('API', 'GET /api/cart/prices — unhandled error', {
      error: error instanceof Error ? error.message : String(error),
    });
    logger.api('GET', '/api/cart/prices', 500, Date.now() - start);
    return NextResponse.json({ error: 'Something went wrong on our end. Please try again in a few moments.' }, { status: 500 });
  }
}
