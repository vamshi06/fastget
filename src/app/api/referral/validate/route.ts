import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { checkReferralCode } from '@/lib/referral';
import { limitOrResponse } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * POST /api/referral/validate
 *
 * Checkout "Apply" button for a friend's referral code. Display-only - the
 * order APIs re-run the same check when the order is actually placed.
 *
 * Body: { code } -> { valid: true, code } | { valid: false, error }
 */
export async function POST(request: NextRequest) {
  const auth = await requireSession();
  if ('response' in auth) return auth.response;

  // Throttle per user so codes can't be brute-forced from checkout.
  const limited = await limitOrResponse([
    { key: `referral-validate:user:${auth.session.userId}`, limit: 20, windowSec: 3600 },
  ]);
  if (limited) return limited;

  try {
    const body = await request.json().catch(() => ({}));
    const result = await checkReferralCode(body?.code, auth.session.userId);
    if (!result.ok) {
      return NextResponse.json({ valid: false, error: result.error });
    }
    return NextResponse.json({ valid: true, code: result.code });
  } catch (error) {
    logger.error('API', 'POST /api/referral/validate - unhandled error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Something went wrong on our end. Please try again in a few moments.' }, { status: 500 });
  }
}
