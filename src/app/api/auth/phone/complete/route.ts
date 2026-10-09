import { NextRequest, NextResponse } from 'next/server';
import { createPhoneUser, getUserByEmail, getUsersByPhone } from '@/lib/users';
import { readPhoneProof } from '@/lib/phone-otp';
import { loggedInResponse, phoneLoginOff, SERVER_ERROR } from '@/lib/phone-login';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/phone/complete   (phone login - off unless enabled)
 * Body: { proof, name, email }
 *
 * Second step of phone SIGNUP: `proof` (from /verify) shows the number was
 * just verified; this creates the customer and logs them in.
 */
export async function POST(request: NextRequest) {
  const off = phoneLoginOff();
  if (off) return off;

  try {
    const body = await request.json().catch(() => ({}));
    const phone = readPhoneProof(body?.proof);
    if (!phone) {
      return NextResponse.json({ success: false, error: 'Your verification expired. Please start again.' }, { status: 400 });
    }

    const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 100) : '';
    if (name.length < 2) return NextResponse.json({ success: false, error: 'Please enter your name' }, { status: 400 });

    // Email is required: it's every phone customer's fallback login (via
    // "Forgot password") and where invoices/updates can go.
    const rawEmail = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!rawEmail) return NextResponse.json({ success: false, error: 'Please enter your email' }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail) || rawEmail.length > 255) {
      return NextResponse.json({ success: false, error: 'That email address doesn’t look right' }, { status: 400 });
    }
    if (await getUserByEmail(rawEmail)) {
      return NextResponse.json({ success: false, error: 'An account already uses this email. Log in with email instead.' }, { status: 409 });
    }

    // The number may have been registered since /verify (double tap, two devices).
    if ((await getUsersByPhone(phone)).length > 0) {
      return NextResponse.json({ success: false, error: 'This number already has an account. Please log in.' }, { status: 409 });
    }

    const user = await createPhoneUser(phone, name, rawEmail);
    if (!user) return NextResponse.json({ success: false, error: SERVER_ERROR }, { status: 500 });

    logger.info('Auth', '[AUTH] Phone signup', { userId: user.id });
    return loggedInResponse(user);
  } catch (error) {
    logger.error('Auth', 'POST /api/auth/phone/complete - unhandled error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ success: false, error: SERVER_ERROR }, { status: 500 });
  }
}
