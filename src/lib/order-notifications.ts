/**
 * New-order staff notifications.
 *
 * Fired from both order-creation paths (COD in /api/orders, Razorpay in
 * /api/payment/verify-payment) once the order is durably saved. Notifies
 * every admin/agent user on two channels:
 *   - Telegram (primary): instant, arrives like any phone notification,
 *     independent of whether the FastGet app is open. Requires the staff
 *     member to have linked their chat ID via My Profile.
 *   - Email (backup): durable record, reuses the existing Resend setup.
 *     Always sent - every staff user has an email by definition.
 *
 * Best-effort: a failure here is logged but never thrown, so a notification
 * outage can never block an order from being placed.
 */

import { Order } from '@/types';
import { getStaffForOrderNotifications } from './users';
import { sendTelegramMessage } from './telegram';
import { sendEmail, getAppUrl } from './email';
import { orderPlacedStaffEmailTemplate } from './email-templates';
import { logger } from './logger';
import { getAvailableStockByProductCodes } from './products';
import { findStockProblems, stockProblemLabel } from './order-stock';

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function telegramText(order: Order, appUrl: string, stockWarnings: Map<string, string>): string {
  const itemLines = order.items
    .map((i) => `• ${i.name} ×${i.quantity}${stockWarnings.has(i.sku) ? ` ⚠ <b>${escapeHtml(stockWarnings.get(i.sku)!)}</b>` : ''}`)
    .join('\n');
  return (
    `🛒 <b>New order placed</b>\n\n` +
    (stockWarnings.size > 0
      ? `⚠ <b>Stock check:</b> ${stockWarnings.size} item${stockWarnings.size !== 1 ? 's' : ''} without enough stock - check before confirming.\n\n`
      : '') +
    `<b>₹${order.total.toLocaleString('en-IN')}</b> - ${order.deliveryType === 'urgent' ? 'Urgent' : 'Scheduled'} - ${order.paymentMethod.toUpperCase()}\n\n` +
    `<b>${order.customerName}</b>\n${order.customerPhone}\n${order.siteAddress}\n\n` +
    `${itemLines}\n\n` +
    (order.referralCode ? `🎁 Referral code: <b>${order.referralCode}</b> (pay referrer after delivery)\n\n` : '') +
    `${appUrl}/admin/orders/${order.id}`
  );
}

/**
 * Notify all admin/agent staff of a newly placed order.
 * Never throws - call this after the order write has already succeeded.
 */
export async function notifyStaffOfNewOrder(order: Order): Promise<void> {
  try {
    const staff = await getStaffForOrderNotifications();
    if (staff.length === 0) {
      logger.warn('OrderNotify', 'No admin/agent users to notify', { orderId: order.id });
      return;
    }

    // Flag items the recorded stock can't cover, so staff know before confirming.
    const stock = await getAvailableStockByProductCodes(order.items.map((i) => i.sku));
    const stockWarnings = new Map<string, string>();
    findStockProblems(order.items, stock).forEach((problem, sku) => {
      stockWarnings.set(sku, stockProblemLabel(problem));
    });

    const appUrl = getAppUrl();
    const tgText = telegramText(order, appUrl, stockWarnings);
    const emailTpl = orderPlacedStaffEmailTemplate(order, appUrl, stockWarnings);

    const results = await Promise.allSettled(
      staff.flatMap((user) => {
        const sends: Promise<boolean>[] = [];
        if (user.telegramChatId) {
          sends.push(sendTelegramMessage({ chatId: user.telegramChatId, text: tgText }));
        }
        if (user.email) {
          sends.push(
            sendEmail({ to: user.email, subject: emailTpl.subject, html: emailTpl.html, text: emailTpl.text }),
          );
        }
        return sends;
      }),
    );

    const failed = results.filter((r) => r.status === 'rejected' || r.value === false).length;
    logger.info('OrderNotify', 'Staff notified of new order', {
      orderId: order.id,
      staffCount: staff.length,
      sends: results.length,
      failed,
    });
  } catch (error) {
    logger.error('OrderNotify', 'notifyStaffOfNewOrder failed', {
      orderId: order.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
