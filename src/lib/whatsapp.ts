import { logger } from '@/lib/logger';

// Sends login codes over WhatsApp using Meta's WhatsApp Cloud API directly (no
// paid middleman). Setup - number, template, token: docs/PHONE_LOGIN_SETUP.md.
//
// Env:
//   WHATSAPP_PHONE_NUMBER_ID  - "Phone number ID" of the FastGet sender number
//   WHATSAPP_ACCESS_TOKEN     - permanent System User token with
//                               whatsapp_business_messaging permission
//   WHATSAPP_OTP_TEMPLATE     - name of the approved Authentication template
//                               (default: fastget_login_code)
//   WHATSAPP_TEMPLATE_LANG    - template language code (default: en)
//   WHATSAPP_API_VERSION      - Graph API version (default: v21.0)

const API_VERSION = process.env.WHATSAPP_API_VERSION || 'v21.0';
const TEMPLATE = process.env.WHATSAPP_OTP_TEMPLATE || 'fastget_login_code';
const TEMPLATE_LANG = process.env.WHATSAPP_TEMPLATE_LANG || 'en';

export function isWhatsAppConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN);
}

/**
 * Send a one-time login code to an Indian mobile (10 digits, no +91) using
 * the Authentication template (Meta's standard "Your code is X" message with
 * a "Copy code" button). Returns false if it couldn't be sent.
 *
 * Not configured + not production: logs the code to the server console
 * instead, so the flow can be tried locally before the number exists.
 */
export async function sendWhatsAppOtp(phone10: string, code: string): Promise<boolean> {
  if (!isWhatsAppConfigured()) {
    if (process.env.NODE_ENV !== 'production') {
      logger.warn('WhatsApp', `[DEV] WhatsApp not configured - login code for ${phone10} is ${code}`);
      return true;
    }
    logger.error('WhatsApp', 'sendWhatsAppOtp - WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN not set');
    return false;
  }

  const url = `https://graph.facebook.com/${API_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: `91${phone10}`,
        type: 'template',
        template: {
          name: TEMPLATE,
          language: { code: TEMPLATE_LANG },
          components: [
            // The code appears in the message body...
            { type: 'body', parameters: [{ type: 'text', text: code }] },
            // ...and is what the "Copy code" button copies.
            { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: code }] },
          ],
        },
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      logger.error('WhatsApp', 'sendWhatsAppOtp - Cloud API error', { status: res.status, detail: detail.slice(0, 500) });
      return false;
    }
    return true;
  } catch (error) {
    logger.error('WhatsApp', 'sendWhatsAppOtp - request failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}
