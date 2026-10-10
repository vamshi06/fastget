import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { getFamilySuggestions, linkProducts, listFamilies } from '@/lib/product-families';
import { isMissingFamiliesTable } from '@/lib/products';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const SERVER_ERROR = 'Something went wrong on our end. Please try again in a few moments.';
const MIGRATION_MISSING = 'Variant families need migration 028 - run `npm run sync-schema` first.';

/** GET /admin/api/families - existing families + suggested ones to review. */
export async function GET() {
  const auth = await requireRole('admin');
  if ('response' in auth) return auth.response;
  try {
    const [families, suggestions] = await Promise.all([listFamilies(), getFamilySuggestions()]);
    return NextResponse.json(
      { success: true, data: { families, suggestions } },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    if (isMissingFamiliesTable(error)) {
      return NextResponse.json({ success: false, error: MIGRATION_MISSING }, { status: 503 });
    }
    logger.error('API', 'GET /admin/api/families - unhandled error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ success: false, error: SERVER_ERROR }, { status: 500 });
  }
}

/**
 * POST /admin/api/families - link products into one family.
 * Body: { productCodes: string[], labels?: { [productCode]: optionLabel } }
 */
export async function POST(request: NextRequest) {
  const auth = await requireRole('admin');
  if ('response' in auth) return auth.response;
  try {
    const body = await request.json().catch(() => null);
    const codes = Array.isArray(body?.productCodes)
      ? body.productCodes.filter((c: unknown): c is string => typeof c === 'string').slice(0, 50)
      : [];
    const labels: Record<string, string> = {};
    if (body?.labels && typeof body.labels === 'object') {
      for (const [code, label] of Object.entries(body.labels)) {
        if (typeof label === 'string') labels[code] = label;
      }
    }
    if (codes.length < 2) {
      return NextResponse.json({ success: false, error: 'Pick at least two products to link.' }, { status: 400 });
    }

    const familyId = await linkProducts(codes, labels);
    logger.info('API', 'Admin linked variant family', { familyId, codes, adminUserId: auth.session.userId });
    return NextResponse.json({ success: true, data: { familyId } });
  } catch (error) {
    if (isMissingFamiliesTable(error)) {
      return NextResponse.json({ success: false, error: MIGRATION_MISSING }, { status: 503 });
    }
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.startsWith('Unknown product code') || msg.startsWith('Pick at least')) {
      return NextResponse.json({ success: false, error: msg }, { status: 400 });
    }
    logger.error('API', 'POST /admin/api/families - unhandled error', { error: msg });
    return NextResponse.json({ success: false, error: SERVER_ERROR }, { status: 500 });
  }
}
