// FastGet's customer contact details - one place to change them.

/** WhatsApp number for pre-order questions (stock, bulk prices, photos), digits with country code. */
export const SUPPORT_WHATSAPP = '917045737058';

/** Link that opens a WhatsApp chat with FastGet, with `text` typed in. */
export function whatsAppChatUrl(text: string): string {
  return `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(text)}`;
}

/**
 * Whether WhatsApp links can be offered here. Always on the website. In the
 * Android app only on builds that hand wa.me links to WhatsApp (they announce
 * it via __FASTGET_CAPS__, see mobile WebViewScreen) - older builds would load
 * WhatsApp's web page inside the app instead.
 */
export function canOpenWhatsApp(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as unknown as { ReactNativeWebView?: unknown; __FASTGET_CAPS__?: unknown };
  if (!w.ReactNativeWebView) return true;
  return Array.isArray(w.__FASTGET_CAPS__) && w.__FASTGET_CAPS__.includes('whatsapp');
}
