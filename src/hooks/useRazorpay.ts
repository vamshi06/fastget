'use client';

import { useCallback, useRef } from 'react';

export interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface RazorpayCheckoutOptions {
  key: string;
  amount: number;        // in paise, as returned by create-order
  currency: string;
  name: string;
  description: string;
  order_id: string;      // Razorpay order_id from create-order
  handler: (response: RazorpayResponse) => void;
  prefill?: {
    name?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayCheckoutOptions) => { open(): void };
  }
}

const RAZORPAY_SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js';

/**
 * Lazily loads the Razorpay checkout.js script and exposes `openCheckout`.
 * The script is loaded only once per page session (tracked via a ref).
 */
export function useRazorpay() {
  const loaded = useRef(false);

  const loadScript = useCallback((): Promise<boolean> => {
    if (loaded.current && window.Razorpay) return Promise.resolve(true);

    return new Promise((resolve) => {
      // Avoid duplicate script tags
      if (document.querySelector(`script[src="${RAZORPAY_SCRIPT}"]`)) {
        loaded.current = true;
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.src = RAZORPAY_SCRIPT;
      script.onload = () => {
        loaded.current = true;
        resolve(true);
      };
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }, []);

  /**
   * Opens the Razorpay checkout modal.  Resolves after the modal is opened;
   * payment result is delivered via the `handler` / `modal.ondismiss` callbacks
   * supplied in `options`.
   */
  const openCheckout = useCallback(
    async (options: RazorpayCheckoutOptions): Promise<void> => {
      const ok = await loadScript();
      if (!ok || !window.Razorpay) {
        throw new Error('Razorpay checkout script failed to load. Check your network connection.');
      }
      const rzp = new window.Razorpay(options);
      rzp.open();
    },
    [loadScript]
  );

  return { openCheckout };
}
