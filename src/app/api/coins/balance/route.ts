import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { getCoinBalance } from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/coins/balance
 *
 * Returns the logged-in user's own coin balance (for the checkout redemption
 * widget). Never accepts a userId param — always the session's own user.
 */
export async function GET() {
  const auth = await requireSession();
  if ('response' in auth) return auth.response;

  try {
    const balance = await getCoinBalance(auth.session.userId);
    return NextResponse.json({ balance });
  } catch (error) {
    logger.error('API', 'GET /api/coins/balance — unhandled error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Something went wrong on our end. Please try again in a few moments.' }, { status: 500 });
  }
}
