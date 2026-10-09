import { NextResponse } from 'next/server';
import { PHONE_LOGIN_ENABLED } from '@/lib/feature-flags';
import { createSessionToken, SESSION_COOKIE_NAME, sessionCookieOptions } from '@/lib/session';
import type { User } from '@/types';

// Shared bits for the /api/auth/phone/* routes (phone login via WhatsApp OTP).

/** While the feature is off the routes behave as if they don't exist. */
export function phoneLoginOff(): NextResponse | null {
  return PHONE_LOGIN_ENABLED
    ? null
    : NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
}

/** Same response + session cookie shape as POST /api/auth/login. */
export async function loggedInResponse(user: User): Promise<NextResponse> {
  const token = await createSessionToken({ userId: user.id, role: user.role });
  const response = NextResponse.json(
    { success: true, id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role },
    { headers: { 'Cache-Control': 'no-store' } },
  );
  response.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions(user.role));
  return response;
}

export const SERVER_ERROR = 'Something went wrong on our end. Please try again in a few moments.';
