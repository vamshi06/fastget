import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { markReferralPaid } from '@/lib/db';
import { REFERRAL_REWARD_RUPEES } from '@/lib/referral';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ orderId: string }> };

/**
 * POST /admin/api/referrals/[orderId]
 *
 * Admin-only: record that the referrer of this (delivered) order has been paid
 * REFERRAL_REWARD_RUPEES in cash/UPI outside the app.
 * Body: { payoutRef?: string } - optional UPI / transaction reference.
 */
export async function POST(request: NextRequest, ctx: Ctx) {
  const auth = await requireRole('admin');
  if ('response' in auth) return auth.response;
  const start = Date.now();

  try {
    const { orderId } = await ctx.params;
    const body = await request.json().catch(() => ({}));
    const payoutRef = typeof body?.payoutRef === 'string' ? body.payoutRef.trim().slice(0, 100) : '';

    const result = await markReferralPaid(orderId, auth.session.userId, REFERRAL_REWARD_RUPEES, payoutRef || undefined);
    if (!result.success) {
      logger.api('POST', '/admin/api/referrals/[orderId]', 400, Date.now() - start);
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    logger.info('API', 'Admin marked referral paid', { orderId, adminUserId: auth.session.userId, amount: REFERRAL_REWARD_RUPEES });
    logger.api('POST', '/admin/api/referrals/[orderId]', 200, Date.now() - start);
    return NextResponse.json({ success: true, paidAt: result.paidAt, amount: REFERRAL_REWARD_RUPEES });
  } catch (error) {
    logger.error('API', 'POST /admin/api/referrals/[orderId] - unhandled error', {
      error: error instanceof Error ? error.message : String(error),
    });
    logger.api('POST', '/admin/api/referrals/[orderId]', 500, Date.now() - start);
    return NextResponse.json({ success: false, error: 'Something went wrong on our end. Please try again in a few moments.' }, { status: 500 });
  }
}
