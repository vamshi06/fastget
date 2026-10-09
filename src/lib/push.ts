/**
 * Push notifications to the FastGet Android app (db/migrations/026_create_push_tokens.sql).
 *
 * The app (mobile/) gets an Expo push token, hands it to the site
 * (NativeShellBridge -> POST /api/push/register), and the site stores it
 * against the signed-in customer. Sends go through Expo's push service, which
 * delivers via Firebase Cloud Messaging - see docs/PUSH_NOTIFICATIONS_SETUP.md
 * for the one-time Firebase / EAS setup.
 *
 * Best-effort like order-notifications.ts: nothing here throws, so a push
 * outage can never fail an order status update.
 */

import { neon } from '@neondatabase/serverless';
import { createTranslator } from 'next-intl';
import { Order, OrderStatus } from '@/types';
import { formatCurrency } from './utils';
import { logger } from './logger';
import enOrder from '../../messages/en/order.json';
import hiOrder from '../../messages/hi/order.json';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
// Must match the channel the app creates (mobile/src/notifications.ts).
const ORDER_CHANNEL_ID = 'orders';
// Expo accepts at most 100 messages per request.
const EXPO_BATCH_SIZE = 100;

const databaseUrl = process.env.DATABASE_URL || process.env.fastget_DATABASE_URL;

function getClient() {
  if (!databaseUrl) throw new Error('DATABASE_URL environment variable is required');
  return neon(databaseUrl.replace('-pooler', ''));
}

/** Expo push tokens look like ExponentPushToken[xxxxxxxx] (or ExpoPushToken[...]). */
export function isExpoPushToken(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 200 && /^Expo(nent)?PushToken\[[A-Za-z0-9_-]+\]$/.test(value);
}

/** Store (or move) a device's token to this user. Returns false on DB error. */
export async function registerPushToken(userId: string, token: string, locale: string): Promise<boolean> {
  try {
    const sql = getClient();
    await sql`
      INSERT INTO push_tokens (token, user_id, locale)
      VALUES (${token}, ${userId}, ${locale})
      ON CONFLICT (token) DO UPDATE
        SET user_id = EXCLUDED.user_id, locale = EXCLUDED.locale, updated_at = NOW()
    `;
    return true;
  } catch (error) {
    logger.error('Push', 'registerPushToken failed', { error: error instanceof Error ? error.message : String(error) });
    return false;
  }
}

/**
 * Forget a device's token (logout). Deleting by token alone is safe without a
 * session: only the device itself knows its token, and the worst case is that
 * device stops getting pushes.
 */
export async function unregisterPushToken(token: string): Promise<void> {
  try {
    const sql = getClient();
    await sql`DELETE FROM push_tokens WHERE token = ${token}`;
  } catch (error) {
    logger.error('Push', 'unregisterPushToken failed', { error: error instanceof Error ? error.message : String(error) });
  }
}

interface PushMessage {
  to: string;
  title: string;
  body: string;
  // In-app path the app opens when the notification is tapped.
  data: { url: string };
}

interface ExpoTicket {
  status: 'ok' | 'error';
  message?: string;
  details?: { error?: string };
}

async function sendToExpo(messages: PushMessage[]): Promise<void> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  // Only needed if "Enhanced push security" is turned on for the Expo project.
  if (process.env.EXPO_ACCESS_TOKEN) headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;

  for (let i = 0; i < messages.length; i += EXPO_BATCH_SIZE) {
    const batch = messages.slice(i, i + EXPO_BATCH_SIZE);
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(
        batch.map((m) => ({ ...m, sound: 'default', priority: 'high', channelId: ORDER_CHANNEL_ID })),
      ),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      logger.error('Push', 'Expo push API error', { status: res.status, body });
      continue;
    }

    // Tickets come back in the same order as the messages. An uninstalled app
    // shows up as DeviceNotRegistered - drop that token so we stop sending to it.
    const json = (await res.json().catch(() => null)) as { data?: ExpoTicket[] } | null;
    const tickets = json?.data ?? [];
    await Promise.all(
      tickets.map(async (ticket, idx) => {
        if (ticket.status !== 'error') return;
        const token = batch[idx]?.to;
        logger.warn('Push', 'Push ticket error', { error: ticket.details?.error, message: ticket.message });
        if (token && ticket.details?.error === 'DeviceNotRegistered') await unregisterPushToken(token);
      }),
    );
  }
}

const orderMessages = { en: enOrder, hi: hiOrder } as const;

function orderStatusMessage(order: Order, status: OrderStatus, locale: string): { title: string; body: string } | null {
  if (status === 'received') return null; // the customer just placed it - nothing to tell them
  const messages = locale === 'hi' ? orderMessages.hi : orderMessages.en;
  const t = createTranslator({ locale: locale === 'hi' ? 'hi' : 'en', messages, namespace: 'push' });
  const total = formatCurrency(order.total);
  if (status === 'eta_assigned') {
    return {
      title: t('eta_assigned.title'),
      body: order.eta ? t('eta_assigned.body', { total, eta: order.eta }) : t('eta_assigned.bodyNoEta', { total }),
    };
  }
  return { title: t(`${status}.title`), body: t(`${status}.body`, { total }) };
}

/**
 * New-order push to every admin/agent device (same recipients as the
 * Telegram + email alerts in order-notifications.ts). Staff copy is English,
 * like those alerts. Tapping opens the order in the admin panel.
 * Never throws.
 */
export async function notifyStaffOfNewOrderPush(order: Order, stockWarningCount: number): Promise<void> {
  if (!databaseUrl) return;
  try {
    const sql = getClient();
    const rows = await sql`
      SELECT pt.token FROM push_tokens pt
      JOIN users u ON u.id = pt.user_id
      WHERE u.role IN ('admin', 'agent')
    `;
    if (rows.length === 0) return;

    const title = stockWarningCount > 0 ? `🛒 New order - ⚠ check stock` : `🛒 New order placed`;
    const body =
      `${formatCurrency(order.total)} · ${order.deliveryType === 'urgent' ? 'Urgent' : 'Scheduled'} · ` +
      `${order.paymentMethod.toUpperCase()} · ${order.customerName}`;
    await sendToExpo(
      rows.map((row) => ({ to: row.token as string, title, body, data: { url: `/admin/orders/${order.id}` } })),
    );
    logger.info('Push', 'Staff pushed new order', { orderId: order.id, devices: rows.length });
  } catch (error) {
    logger.error('Push', 'notifyStaffOfNewOrderPush failed', {
      orderId: order.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Tell the order's customer their order moved to `status`, on every device
 * they've signed into the app on. Guest orders (no userId) get nothing.
 * Never throws - call after the status update has already succeeded.
 */
export async function notifyCustomerOfStatusChange(order: Order, status: OrderStatus): Promise<void> {
  if (!order.userId || !databaseUrl) return;
  try {
    const sql = getClient();
    const rows = await sql`SELECT token, locale FROM push_tokens WHERE user_id = ${order.userId}`;
    if (rows.length === 0) return;

    const messages: PushMessage[] = [];
    for (const row of rows) {
      const text = orderStatusMessage(order, status, row.locale as string);
      if (text) messages.push({ to: row.token as string, ...text, data: { url: `/order/${order.statusToken}` } });
    }
    if (messages.length === 0) return;

    await sendToExpo(messages);
    logger.info('Push', 'Customer notified of status change', { orderId: order.id, status, devices: messages.length });
  } catch (error) {
    logger.error('Push', 'notifyCustomerOfStatusChange failed', {
      orderId: order.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
