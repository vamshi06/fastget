'use client';

import { useEffect, useState } from 'react';
import { canOpenWhatsApp, whatsAppChatUrl } from '@/lib/contact';
import { track } from '@/lib/analytics';
import { isNativeApp } from '@/lib/native-bridge';

interface WhatsAppChatLinkProps {
  /** Message typed into the chat for the customer, e.g. which product they're asking about. */
  text: string;
  /** Where the chat was opened from, for analytics. */
  source: 'support' | 'account' | 'product' | 'order';
  className?: string;
  children: React.ReactNode;
}

/**
 * Opens a WhatsApp chat with FastGet (pre-order questions: stock, bulk prices,
 * photos). Renders nothing where WhatsApp can't be opened (older app builds).
 */
export function WhatsAppChatLink({ text, source, className, children }: WhatsAppChatLinkProps) {
  // Reads window, so decided after mounting (server render shows nothing).
  const [available, setAvailable] = useState(false);
  const [inApp, setInApp] = useState(false);
  useEffect(() => {
    setAvailable(canOpenWhatsApp());
    setInApp(isNativeApp());
  }, []);
  if (!available) return null;

  return (
    <a
      href={whatsAppChatUrl(text)}
      // The app intercepts the navigation and opens WhatsApp; a new tab is web-only.
      target={inApp ? undefined : '_blank'}
      rel="noopener noreferrer"
      onClick={() => track('whatsapp_chat_opened', { source })}
      className={className}
    >
      {children}
    </a>
  );
}
