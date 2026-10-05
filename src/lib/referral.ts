import { getUserIdByReferralCode } from '@/lib/users';
import { hasNonCancelledOrder } from '@/lib/db';

/**
 * Referral program (cash payout).
 *
 * A customer (the referrer) shares their referral code. A friend enters it at
 * checkout on their first order; the order records the code + referrer but is
 * priced normally. Once that order is delivered, an admin pays the referrer
 * REFERRAL_REWARD_RUPEES in cash/UPI and marks it paid at /admin/referrals.
 */

export const REFERRAL_REWARD_RUPEES = 200;

/** Normalize user input (trim, uppercase). Returns null for empty / malformed input. */
export function normalizeReferralCode(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const code = input.trim().toUpperCase();
  if (!code) return null;
  return /^[A-Z0-9]{4,16}$/.test(code) ? code : null;
}

export type ReferralCheck =
  | { ok: true; code: string; referrerId: string }
  | { ok: false; error: string };

/**
 * Validate a referral code entered at checkout by `userId` (the friend).
 * Re-run server-side when the order is placed - never trusted from the client.
 *
 * Rules: the code must exist, can't be the user's own, and only applies to a
 * user's first order (cancelled orders don't count, so a cancelled first
 * order doesn't burn the referral).
 */
export async function checkReferralCode(rawCode: unknown, userId: string): Promise<ReferralCheck> {
  const code = normalizeReferralCode(rawCode);
  const referrerId = code ? await getUserIdByReferralCode(code) : null;
  if (!code || !referrerId) {
    return { ok: false, error: 'This referral code is not valid. Please check it or remove it.' };
  }
  if (referrerId === userId) {
    return { ok: false, error: 'You cannot use your own referral code.' };
  }
  if (await hasNonCancelledOrder(userId)) {
    return { ok: false, error: 'Referral codes can only be used on your first order.' };
  }
  return { ok: true, code, referrerId };
}

/**
 * Order-creation wrapper around checkReferralCode: no code entered is fine
 * (ok, nothing to record); a code entered on a guest order is rejected since
 * there's no account to check "first order" against.
 */
export async function resolveReferralForOrder(
  rawCode: unknown,
  userId: string | undefined,
): Promise<{ ok: true; code?: string; referrerId?: string } | { ok: false; error: string }> {
  if (typeof rawCode !== 'string' || !rawCode.trim()) return { ok: true };
  if (!userId) return { ok: false, error: 'Please log in to use a referral code.' };
  return checkReferralCode(rawCode, userId);
}
