import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { getOrCreateReferralCode } from '@/lib/users';
import { getReferralsForReferrer } from '@/lib/db';
import { REFERRAL_REWARD_RUPEES } from '@/lib/referral';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/referral
 *
 * The logged-in user's own referral code (generated on first call), the cash
 * reward per successful referral, and the orders friends have placed with it.
 * Always the session's own user - no userId param.
 */
export async function GET() {
  const auth = await requireSession();
  if ('response' in auth) return auth.response;

  try {
    const [code, referrals] = await Promise.all([
      getOrCreateReferralCode(auth.session.userId),
      getReferralsForReferrer(auth.session.userId),
    ]);
    if (!code) {
      return NextResponse.json({ error: 'Could not load your referral code. Please try again.' }, { status: 500 });
    }
    return NextResponse.json({ code, rewardAmount: REFERRAL_REWARD_RUPEES, referrals });
  } catch (error) {
    logger.error('API', 'GET /api/referral - unhandled error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Something went wrong on our end. Please try again in a few moments.' }, { status: 500 });
  }
}
