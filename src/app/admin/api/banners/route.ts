import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { createBanner, getAllBannersForAdmin, parseBannerInput } from '@/lib/banners';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const SERVER_ERROR = 'Something went wrong on our end. Please try again in a few moments.';

/** GET /admin/api/banners - every banner (live or not), in display order. */
export async function GET(_request: NextRequest) {
  const auth = await requireRole('admin');
  if ('response' in auth) return auth.response;
  try {
    const banners = await getAllBannersForAdmin();
    return NextResponse.json({ success: true, data: banners }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    logger.error('API', 'GET /admin/api/banners - unhandled error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ success: false, error: SERVER_ERROR }, { status: 500 });
  }
}

/** POST /admin/api/banners - add a banner. Body: see parseBannerInput. */
export async function POST(request: NextRequest) {
  const auth = await requireRole('admin');
  if ('response' in auth) return auth.response;
  try {
    const parsed = parseBannerInput(await request.json().catch(() => null));
    if (!parsed.ok) return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });

    const banner = await createBanner(parsed.value);
    revalidatePath('/');
    logger.info('API', 'Admin created home banner', { bannerId: banner.id, adminUserId: auth.session.userId });
    return NextResponse.json({ success: true, data: banner });
  } catch (error) {
    logger.error('API', 'POST /admin/api/banners - unhandled error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ success: false, error: SERVER_ERROR }, { status: 500 });
  }
}
