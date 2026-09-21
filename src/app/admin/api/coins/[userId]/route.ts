import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { getCoinBalance, getCoinTransactions, adjustCoinsAdmin } from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ userId: string }> };

/**
 * GET /admin/api/coins/[userId]
 *
 * Admin-only: a user's current coin balance and transaction history.
 */
export async function GET(_request: NextRequest, ctx: Ctx) {
  const auth = await requireRole('admin');
  if ('response' in auth) return auth.response;
  const start = Date.now();

  try {
    const { userId } = await ctx.params;
    const [balance, transactions] = await Promise.all([
      getCoinBalance(userId),
      getCoinTransactions(userId),
    ]);

    logger.api('GET', '/admin/api/coins/[userId]', 200, Date.now() - start);
    return NextResponse.json({ success: true, balance, transactions });
  } catch (error) {
    logger.error('API', 'GET /admin/api/coins/[userId] — unhandled error', {
      error: error instanceof Error ? error.message : String(error),
    });
    logger.api('GET', '/admin/api/coins/[userId]', 500, Date.now() - start);
    return NextResponse.json({ success: false, error: 'Something went wrong on our end. Please try again in a few moments.' }, { status: 500 });
  }
}

/**
 * POST /admin/api/coins/[userId]
 *
 * Admin-only: manually adjust a user's coin balance (dispute/correction).
 * Body: { delta: number } — positive to add, negative to subtract.
 */
export async function POST(request: NextRequest, ctx: Ctx) {
  const auth = await requireRole('admin');
  if ('response' in auth) return auth.response;
  const start = Date.now();

  try {
    const { userId } = await ctx.params;
    const body = await request.json();
    const delta = Number(body?.delta);

    if (!Number.isInteger(delta) || delta === 0) {
      logger.api('POST', '/admin/api/coins/[userId]', 400, Date.now() - start);
      return NextResponse.json({ success: false, error: 'delta must be a non-zero integer' }, { status: 400 });
    }

    const balance = await adjustCoinsAdmin(userId, delta, auth.session.userId);
    if (balance === null) {
      logger.api('POST', '/admin/api/coins/[userId]', 404, Date.now() - start);
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    logger.info('API', 'Admin adjusted coin balance', { userId, delta, adminUserId: auth.session.userId, newBalance: balance });
    logger.api('POST', '/admin/api/coins/[userId]', 200, Date.now() - start);
    return NextResponse.json({ success: true, balance });
  } catch (error) {
    logger.error('API', 'POST /admin/api/coins/[userId] — unhandled error', {
      error: error instanceof Error ? error.message : String(error),
    });
    logger.api('POST', '/admin/api/coins/[userId]', 500, Date.now() - start);
    return NextResponse.json({ success: false, error: 'Something went wrong on our end. Please try again in a few moments.' }, { status: 500 });
  }
}
