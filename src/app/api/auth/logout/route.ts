import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/lib/session';
import { isExpoPushToken, unregisterPushToken } from '@/lib/push';

export async function POST(request: NextRequest) {
  // Inside the Android app the client sends this device's push token, so a
  // shared phone stops getting the previous user's order notifications.
  const body = await request.json().catch(() => null);
  if (isExpoPushToken(body?.pushToken)) await unregisterPushToken(body.pushToken);

  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE_NAME, '', { maxAge: 0, path: '/' });
  return response;
}
