import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { getUserById } from '@/lib/users';
import { issueOtp, normalizeIndianMobile, type OtpPurpose } from '@/lib/phone-otp';
import { sendWhatsAppOtp } from '@/lib/whatsapp';
import { getClientIp, limitOrResponse } from '@/lib/rate-limit';
import { phoneLoginOff, SERVER_ERROR } from '@/lib/phone-login';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/phone/send-otp   (phone login - off unless enabled)
 *
 * Body: { phone } - sends a login code over WhatsApp.
 *       { purpose: 'delete_account' } - sends a code to the LOGGED-IN user's
 *       own number to confirm account deletion (phone-only accounts have no
 *       password to confirm with).
 *
 * Never reveals whether a number has an account: any valid number gets a code.
 */
export async function POST(request: NextRequest) {
  const off = phoneLoginOff();
  if (off) return off;

  try {
    const body = await request.json().catch(() => ({}));
    const purpose: OtpPurpose = body?.purpose === 'delete_account' ? 'delete_account' : 'login';

    let phone: string | null;
    if (purpose === 'delete_account') {
      const auth = await requireSession();
      if ('response' in auth) return auth.response;
      const user = await getUserById(auth.session.userId);
      phone = user ? normalizeIndianMobile(user.phone) : null;
      if (!phone) return NextResponse.json({ success: false, error: 'Please log in again.' }, { status: 401 });
    } else {
      phone = normalizeIndianMobile(body?.phone);
      if (!phone) {
        return NextResponse.json({ success: false, error: 'Enter a valid 10-digit mobile number' }, { status: 400 });
      }
    }

    // Each code costs money to send - cap per number and per network.
    const ip = getClientIp(request);
    const limited = await limitOrResponse([
      { key: `otp:phone:${phone}`, limit: 5, windowSec: 3600 },
      { key: `otp:ip:${ip}`, limit: 15, windowSec: 3600 },
    ]);
    if (limited) return limited;

    const issued = await issueOtp(phone, purpose);
    if (!issued.ok) {
      return NextResponse.json(
        { success: false, error: `Please wait ${issued.retryAfterSec}s before asking for a new code`, retryAfterSec: issued.retryAfterSec },
        { status: 429 },
      );
    }

    const sent = await sendWhatsAppOtp(phone, issued.code);
    if (!sent) {
      return NextResponse.json({ success: false, error: 'Could not send the code right now. Please try again or use email login.' }, { status: 502 });
    }

    logger.info('Auth', 'phone OTP sent', { purpose, last4: phone.slice(-4) });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Auth', 'POST /api/auth/phone/send-otp - unhandled error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ success: false, error: SERVER_ERROR }, { status: 500 });
  }
}
