import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { isExpoPushToken, registerPushToken } from '@/lib/push';
import { defaultLocale, isLocale } from '@/i18n/config';

/**
 * POST /api/push/register
 *
 * Called by NativeShellBridge inside the Android app once the app hands it
 * an Expo push token. Ties the token to the signed-in user (from the session
 * cookie, never the request body) so order status pushes reach this device.
 */
export async function POST(request: NextRequest) {
  const start = Date.now();
  const auth = await requireSession();
  if ('response' in auth) return auth.response;

  try {
    const body = await request.json().catch(() => null);
    const token = body?.token;
    if (!isExpoPushToken(token)) {
      logger.api('POST', '/api/push/register', 400, Date.now() - start);
      return NextResponse.json({ error: 'Invalid push token' }, { status: 400 });
    }
    const locale = isLocale(body?.locale) ? body.locale : defaultLocale;

    const ok = await registerPushToken(auth.session.userId, token, locale);
    logger.api('POST', '/api/push/register', ok ? 200 : 500, Date.now() - start);
    return ok
      ? NextResponse.json({ success: true })
      : NextResponse.json({ error: 'Failed to register device' }, { status: 500 });
  } catch (error) {
    logger.error('API', 'POST /api/push/register - unhandled error', {
      error: error instanceof Error ? error.message : String(error),
    });
    logger.api('POST', '/api/push/register', 500, Date.now() - start);
    return NextResponse.json({ error: 'Something went wrong on our end. Please try again in a few moments.' }, { status: 500 });
  }
}
