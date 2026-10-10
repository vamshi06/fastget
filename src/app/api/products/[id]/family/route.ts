import { NextRequest, NextResponse } from 'next/server';
import { getFamilyProducts } from '@/lib/products';
import { isLocale } from '@/i18n/config';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/products/[id]/family?lang=
 * Every active size in the product's variant family (each a full product with
 * optionLabel), for the product page's size buttons and the catalog's size
 * sheet. `products` is empty when the product has no family.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const langRaw = request.nextUrl.searchParams.get('lang') ?? undefined;
    const products = await getFamilyProducts(decodeURIComponent(id), isLocale(langRaw) ? langRaw : undefined);
    return NextResponse.json(
      { success: true, data: { products } },
      { headers: { 'Cache-Control': 'public, max-age=30' } },
    );
  } catch (error) {
    logger.error('API', 'GET /api/products/[id]/family - unhandled error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ success: false, error: 'Failed to load sizes' }, { status: 500 });
  }
}
