/**
 * FastGet Telegram notification sender.
 *
 * Used for staff-facing alerts (new order placed) that need to reach an
 * admin/agent's phone as a native push notification regardless of whether
 * the FastGet app is open — see src/lib/order-notifications.ts.
 *
 * Setup:
 *   1. Message @BotFather on Telegram, run /newbot, follow the prompts.
 *      You'll get a bot token shaped like <bot-id>:<35-char-secret>.
 *   2. Set TELEGRAM_BOT_TOKEN to that value (.env.local / Vercel env).
 *   3. Each admin/agent messages @userinfobot to get their own numeric chat ID,
 *      then enters it under My Profile → Telegram Notifications in the app.
 *      (They must also open a chat with your bot at least once — e.g. by
 *      searching for it and pressing Start — or the bot cannot message them.)
 *
 * Without TELEGRAM_BOT_TOKEN set, sends are logged and skipped (mock mode) —
 * same fallback behavior as EMAIL_PROVIDER=mock in email.ts.
 */

import { logger } from './logger';

export interface TelegramMessage {
  chatId: string;
  text: string;
}

async function sendViaMock(msg: TelegramMessage): Promise<boolean> {
  const border = '─'.repeat(52);
  console.log(`\n📨 MOCK TELEGRAM ${border}`);
  console.log(`  Chat ID: ${msg.chatId}`);
  console.log(`  Text:\n${msg.text.split('\n').map(l => '    ' + l).join('\n')}`);
  console.log(`${border}\n`);
  logger.info('Telegram', `[mock] → ${msg.chatId}`);
  return true;
}

/**
 * Send a single Telegram message via the Bot API. Returns false (never
 * throws) on failure so callers can fan out to many recipients without one
 * bad chat ID aborting the rest.
 */
export async function sendTelegramMessage(msg: TelegramMessage): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    logger.warn('Telegram', 'TELEGRAM_BOT_TOKEN not set — falling back to mock (no real delivery)');
    return sendViaMock(msg);
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: msg.chatId,
        text: msg.text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      logger.error('Telegram', 'sendMessage API error', { status: res.status, body, chatId: msg.chatId });
      return false;
    }
    logger.info('Telegram', `Sent → ${msg.chatId}`);
    return true;
  } catch (error) {
    logger.error('Telegram', 'sendMessage failed', {
      chatId: msg.chatId,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}
