import { NextRequest, NextResponse } from 'next/server';
import { updateUserProfile, updateTelegramChatId } from '@/lib/users';
import { requireSession } from '@/lib/auth';
import { ValidationError, requireString, requirePhone10, optionalString } from '@/lib/validation';

// The user is derived from the verified session cookie, never from the request
// body, so a client can only ever update its own profile.
export async function PUT(req: NextRequest) {
  const auth = await requireSession();
  if ('response' in auth) return auth.response;

  try {
    const body = await req.json();
    const name = requireString(body.name, 'name', { max: 100 });
    const phone = requirePhone10(body.phone);

    let user = await updateUserProfile(auth.session.userId, { name, phone });
    if (!user) {
      return NextResponse.json({ success: false, error: 'Failed to update profile' }, { status: 500 });
    }

    // Optional: staff (admin/agent) linking their Telegram chat ID for new-order
    // alerts (src/lib/order-notifications.ts). Only touched when the field is
    // present in the request at all, so unrelated profile edits never clear it.
    if ('telegramChatId' in body) {
      const telegramChatId = optionalString(body.telegramChatId, 'telegram chat id', {
        max: 64,
        pattern: /^-?\d+$/,
        patternMsg: 'Telegram chat ID must be numeric (from @userinfobot).',
      });
      const updated = await updateTelegramChatId(auth.session.userId, telegramChatId ?? null);
      if (updated) user = updated;
    }

    return NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone, telegramChatId: user.telegramChatId },
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { success: false, error: 'Something went wrong on our end. Please try again in a few moments.' },
      { status: 500 },
    );
  }
}
