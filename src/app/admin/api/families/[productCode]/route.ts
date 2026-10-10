import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { getFamilyOf, setOptionLabel, unlinkProduct } from '@/lib/product-families';
import { isMissingFamiliesTable } from '@/lib/products';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ productCode: string }> };

const SERVER_ERROR = 'Something went wrong on our end. Please try again in a few moments.';
const MIGRATION_MISSING = 'Variant families need migration 028 - run `npm run sync-schema` first.';

function failure(error: unknown, route: string) {
  if (isMissingFamiliesTable(error)) {
    return NextResponse.json({ success: false, error: MIGRATION_MISSING }, { status: 503 });
  }
  logger.error('API', `${route} - unhandled error`, { error: error instanceof Error ? error.message : String(error) });
  return NextResponse.json({ success: false, error: SERVER_ERROR }, { status: 500 });
}

/** GET /admin/api/families/[productCode] - the product's family (or null). */
export async function GET(_request: NextRequest, ctx: Ctx) {
  const auth = await requireRole('admin');
  if ('response' in auth) return auth.response;
  try {
    const { productCode } = await ctx.params;
    const family = await getFamilyOf(decodeURIComponent(productCode));
    return NextResponse.json({ success: true, data: { family } }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return failure(error, 'GET /admin/api/families/[productCode]');
  }
}

/** PATCH /admin/api/families/[productCode] - rename its size option. Body: { optionLabel } */
export async function PATCH(request: NextRequest, ctx: Ctx) {
  const auth = await requireRole('admin');
  if ('response' in auth) return auth.response;
  try {
    const { productCode } = await ctx.params;
    const body = await request.json().catch(() => null);
    const label = typeof body?.optionLabel === 'string' ? body.optionLabel : '';
    if (!label.trim()) {
      return NextResponse.json({ success: false, error: 'Option label is required.' }, { status: 400 });
    }
    const ok = await setOptionLabel(decodeURIComponent(productCode), label);
    if (!ok) return NextResponse.json({ success: false, error: 'This product is not in a family.' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return failure(error, 'PATCH /admin/api/families/[productCode]');
  }
}

/** DELETE /admin/api/families/[productCode] - take the product out of its family. */
export async function DELETE(_request: NextRequest, ctx: Ctx) {
  const auth = await requireRole('admin');
  if ('response' in auth) return auth.response;
  try {
    const { productCode } = await ctx.params;
    await unlinkProduct(decodeURIComponent(productCode));
    logger.info('API', 'Admin unlinked product from family', { productCode, adminUserId: auth.session.userId });
    return NextResponse.json({ success: true });
  } catch (error) {
    return failure(error, 'DELETE /admin/api/families/[productCode]');
  }
}
