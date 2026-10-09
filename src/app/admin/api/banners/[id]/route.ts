import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { deleteBanner, parseBannerInput, updateBanner } from '@/lib/banners';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SERVER_ERROR = 'Something went wrong on our end. Please try again in a few moments.';

/** PUT /admin/api/banners/[id] - replace a banner's fields. */
export async function PUT(request: NextRequest, ctx: Ctx) {
  const auth = await requireRole('admin');
  if ('response' in auth) return auth.response;
  try {
    const { id } = await ctx.params;
    if (!UUID_RE.test(id)) return NextResponse.json({ success: false, error: 'Banner not found' }, { status: 404 });

    const parsed = parseBannerInput(await request.json().catch(() => null));
    if (!parsed.ok) return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });

    const banner = await updateBanner(id, parsed.value);
    if (!banner) return NextResponse.json({ success: false, error: 'Banner not found' }, { status: 404 });

    revalidatePath('/');
    logger.info('API', 'Admin updated home banner', { bannerId: id, adminUserId: auth.session.userId });
    return NextResponse.json({ success: true, data: banner });
  } catch (error) {
    logger.error('API', 'PUT /admin/api/banners/[id] - unhandled error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ success: false, error: SERVER_ERROR }, { status: 500 });
  }
}

/** DELETE /admin/api/banners/[id] */
export async function DELETE(_request: NextRequest, ctx: Ctx) {
  const auth = await requireRole('admin');
  if ('response' in auth) return auth.response;
  try {
    const { id } = await ctx.params;
    if (!UUID_RE.test(id) || !(await deleteBanner(id))) {
      return NextResponse.json({ success: false, error: 'Banner not found' }, { status: 404 });
    }
    revalidatePath('/');
    logger.info('API', 'Admin deleted home banner', { bannerId: id, adminUserId: auth.session.userId });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('API', 'DELETE /admin/api/banners/[id] - unhandled error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ success: false, error: SERVER_ERROR }, { status: 500 });
  }
}
