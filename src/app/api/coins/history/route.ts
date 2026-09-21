import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { getCoinBalance, getCoinTransactions } from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/coins/history
 *
 * Returns the logged-in user's own coin balance and transaction history (for
 * the "My Coins" account page). Always the session's own user — no userId param.
 */
export async function GET() {
  const auth = await requireSession();
  if ('response' in auth) return auth.response;

  try {
    const [balance, transactions] = await Promise.all([
      getCoinBalance(auth.session.userId),
      getCoinTransactions(auth.session.userId),
    ]);
    return NextResponse.json({ balance, transactions });
  } catch (error) {
    logger.error('API', 'GET /api/coins/history — unhandled error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Something went wrong on our end. Please try again in a few moments.' }, { status: 500 });
  }
}
