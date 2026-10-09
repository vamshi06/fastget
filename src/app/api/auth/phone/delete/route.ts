import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { deleteUser, getUserById } from '@/lib/users';
import { normalizeIndianMobile, verifyOtp } from '@/lib/phone-otp';
import { SESSION_COOKIE_NAME } from '@/lib/session';
import { phoneLoginOff, SERVER_ERROR } from '@/lib/phone-login';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/auth/phone/delete   (phone login - off unless enabled)
 * Body: { code }
 *
 * Account deletion for customers who signed up by phone and have no password
 * (the regular /api/auth/delete confirms with a password). The code comes from
 * send-otp with purpose 'delete_account', sent to the logged-in user's number.
 */
export async function DELETE(request: Request) {
  const off = phoneLoginOff();
  if (off) return off;

  try {
    // requireSession also blocks cross-site requests (CSRF).
    const auth = await requireSession();
    if ('response' in auth) return auth.response;
    const user = await getUserById(auth.session.userId);
    const phone = user ? normalizeIndianMobile(user.phone) : null;
    if (!user || !phone) return NextResponse.json({ success: false, error: 'Please log in again.' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const check = await verifyOtp(phone, 'delete_account', body?.code);
    if (check !== 'ok') {
      return NextResponse.json({ success: false, error: 'That code is not right or has expired.' }, { status: 400 });
    }

    if (!(await deleteUser(user.id))) {
      return NextResponse.json({ success: false, error: 'Could not delete the account' }, { status: 400 });
    }

    logger.info('Auth', 'User account deleted (phone confirmation)', { userId: user.id });
    const response = NextResponse.json({ success: true });
    response.cookies.set(SESSION_COOKIE_NAME, '', { path: '/', maxAge: 0 });
    return response;
  } catch (error) {
    logger.error('Auth', 'DELETE /api/auth/phone/delete - unhandled error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ success: false, error: SERVER_ERROR }, { status: 500 });
  }
}
