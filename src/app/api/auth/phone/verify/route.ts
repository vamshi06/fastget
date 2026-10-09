import { NextRequest, NextResponse } from 'next/server';
import { getUsersByPhone, markPhoneVerified } from '@/lib/users';
import { createPhoneProof, normalizeIndianMobile, verifyOtp } from '@/lib/phone-otp';
import { getClientIp, limitOrResponse } from '@/lib/rate-limit';
import { loggedInResponse, phoneLoginOff, SERVER_ERROR } from '@/lib/phone-login';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const CODE_ERRORS = {
  invalid: 'That code is not right. Check it and try again.',
  expired: 'That code has expired. Ask for a new one.',
  too_many_attempts: 'Too many wrong tries. Ask for a new code.',
} as const;

/**
 * POST /api/auth/phone/verify   (phone login - off unless enabled)
 * Body: { phone, code }
 *
 * - Number has one customer account  -> logs in (session cookie).
 * - Number has no account            -> { needsProfile: true, proof } and the
 *   app asks for a name, then calls /api/auth/phone/complete.
 * - Staff (admin/agent) accounts     -> refused; staff log in with email +
 *   password so an admin session never hangs on one WhatsApp code.
 * - Number shared by several accounts -> refused (fix in admin first).
 */
export async function POST(request: NextRequest) {
  const off = phoneLoginOff();
  if (off) return off;

  try {
    const body = await request.json().catch(() => ({}));
    const phone = normalizeIndianMobile(body?.phone);
    if (!phone) return NextResponse.json({ success: false, error: 'Enter a valid 10-digit mobile number' }, { status: 400 });

    // Guessing limit on top of the per-code attempt cap.
    const limited = await limitOrResponse([
      { key: `otpv:phone:${phone}`, limit: 10, windowSec: 900 },
      { key: `otpv:ip:${getClientIp(request)}`, limit: 30, windowSec: 900 },
    ]);
    if (limited) return limited;

    const check = await verifyOtp(phone, 'login', body?.code);
    if (check !== 'ok') return NextResponse.json({ success: false, error: CODE_ERRORS[check] }, { status: 400 });

    const accounts = await getUsersByPhone(phone);
    if (accounts.length > 1) {
      logger.warn('Auth', 'phone login - number shared by several accounts', { last4: phone.slice(-4), count: accounts.length });
      return NextResponse.json(
        { success: false, error: 'This number is linked to more than one account. Please log in with email or contact support.' },
        { status: 409 },
      );
    }

    const user = accounts[0];
    if (!user) {
      return NextResponse.json({ success: true, needsProfile: true, proof: createPhoneProof(phone) });
    }
    if (user.role !== 'customer') {
      return NextResponse.json({ success: false, error: 'Staff accounts log in with email and password.' }, { status: 403 });
    }

    await markPhoneVerified(user.id);
    logger.info('Auth', '[AUTH] Phone login', { userId: user.id });
    return loggedInResponse(user);
  } catch (error) {
    logger.error('Auth', 'POST /api/auth/phone/verify - unhandled error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ success: false, error: SERVER_ERROR }, { status: 500 });
  }
}
