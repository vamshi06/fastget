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
    logger.error('API', 'GET /admin/api/coins/[userId] - unhandled error', {
      error: error instanceof Error ? error.message : String(error),
    });
    logger.api('GET', '/admin/api/coins/[userId]', 500, Date.now() - start);
    return NextResponse.json({ success: false, error: 'Something went wrong on our end. Please try again in a few moments.' }, { status: 500 });
  }
}

// Guard against typos like 50000 instead of 500 - larger corrections can be split.
const MAX_ADJUSTMENT = 10000;

/**
 * POST /admin/api/coins/[userId]
 *
 * Admin-only: manually adjust a user's coin balance (dispute/correction).
 * Body: { delta: number, note: string } - delta positive to add, negative to
 * subtract (never below a zero balance); note is the required reason.
 */
export async function POST(request: NextRequest, ctx: Ctx) {
  const auth = await requireRole('admin');
  if ('response' in auth) return auth.response;
  const start = Date.now();

  try {
    const { userId } = await ctx.params;
    const body = await request.json();
    const delta = Number(body?.delta);
    const note = typeof body?.note === 'string' ? body.note.trim().slice(0, 300) : '';

    if (!Number.isInteger(delta) || delta === 0 || Math.abs(delta) > MAX_ADJUSTMENT) {
      logger.api('POST', '/admin/api/coins/[userId]', 400, Date.now() - start);
      return NextResponse.json(
        { success: false, error: `Amount must be a whole number between 1 and ${MAX_ADJUSTMENT.toLocaleString('en-IN')}.` },
        { status: 400 },
      );
    }
    if (note.length < 3) {
      logger.api('POST', '/admin/api/coins/[userId]', 400, Date.now() - start);
      return NextResponse.json({ success: false, error: 'Please give a reason for this adjustment.' }, { status: 400 });
    }

    const result = await adjustCoinsAdmin(userId, delta, auth.session.userId, note);
    if (!result.success) {
      if (result.error === 'not_found') {
        logger.api('POST', '/admin/api/coins/[userId]', 404, Date.now() - start);
        return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
      }
      if (result.error === 'insufficient_balance') {
        logger.api('POST', '/admin/api/coins/[userId]', 400, Date.now() - start);
        return NextResponse.json(
          { success: false, error: `Can't subtract ${Math.abs(delta)} coins - the balance is only ${result.balance ?? 0}.` },
          { status: 400 },
        );
      }
      logger.api('POST', '/admin/api/coins/[userId]', 500, Date.now() - start);
      return NextResponse.json({ success: false, error: 'Failed to adjust the balance. Please try again.' }, { status: 500 });
    }

    logger.info('API', 'Admin adjusted coin balance', { userId, delta, adminUserId: auth.session.userId, newBalance: result.balance });
    logger.api('POST', '/admin/api/coins/[userId]', 200, Date.now() - start);
    return NextResponse.json({ success: true, balance: result.balance });
  } catch (error) {
    logger.error('API', 'POST /admin/api/coins/[userId] - unhandled error', {
      error: error instanceof Error ? error.message : String(error),
    });
    logger.api('POST', '/admin/api/coins/[userId]', 500, Date.now() - start);
    return NextResponse.json({ success: false, error: 'Something went wrong on our end. Please try again in a few moments.' }, { status: 500 });
  }
}
