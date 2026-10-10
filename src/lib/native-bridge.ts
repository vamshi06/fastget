import { useEffect, useRef } from 'react';

// Bridge to the Expo wrapper app (mobile/). react-native-webview injects
// window.ReactNativeWebView into every page it loads, so its presence is how
// the site knows it's running inside the app rather than a browser.

type HapticStyle = 'light' | 'medium' | 'success' | 'error';

type NativeMessage =
  | { type: 'HAPTIC'; style: HapticStyle }
  | { type: 'BACK_INTERCEPT'; active: boolean }
  // Native shell (mobile/src/shell): what the app's own chrome should show.
  | { type: 'SHELL_CONFIG'; version: number; labels: Record<string, string> }
  | { type: 'ROUTE'; path: string; title: string }
  | {
      type: 'CART_COUNT';
      count: number;
      // Pre-formatted for the app's floating cart pill.
      itemsLabel: string;
      totalLabel: string;
      hint?: string;
      cta: string;
    }
  // What the page is showing, so the native bars match. Older app builds ignore it.
  | { type: 'THEME'; theme: 'light' | 'dark' }
  | { type: 'SHARE_TEXT'; text: string }
  | { type: 'DOWNLOAD_PDF'; url: string }
  // Signed in: ask the app for its push token (it may show Android's
  // notification permission prompt). It answers with a `fastget:push-token` event.
  | { type: 'PUSH_REGISTER' };

// This device's Expo push token, once the app has handed it over. Sent with
// logout so the device stops getting the signed-out user's notifications.
let pushToken: string | null = null;

export function getPushToken(): string | null {
  return pushToken;
}

export function setPushToken(token: string | null) {
  pushToken = token;
}

export function isNativeApp(): boolean {
  return typeof window !== 'undefined' && !!(window as any).ReactNativeWebView;
}

// The app draws its own tab bar / top bar (class set by the head script in
// layout.tsx). Older app builds don't, and the site keeps its own chrome.
export function isNativeShell(): boolean {
  return typeof document !== 'undefined' && document.documentElement.classList.contains('native-shell');
}

// Page-specific titles for the app's top bar (e.g. the product name), keyed
// by path. NativeShellBridge sends these in place of its route defaults.
const pageTitles = new Map<string, string>();

export function getPageTitle(path: string): string | undefined {
  return pageTitles.get(path);
}

export function useNativeTitle(title: string | null | undefined) {
  useEffect(() => {
    if (!title || !isNativeApp()) return;
    const path = window.location.pathname;
    pageTitles.set(path, title);
    postToNative({ type: 'ROUTE', path, title });
    return () => {
      pageTitles.delete(path);
    };
  }, [title]);
}

export function postToNative(message: NativeMessage): boolean {
  if (!isNativeApp()) return false;
  (window as any).ReactNativeWebView.postMessage(JSON.stringify(message));
  return true;
}

// No-op in the browser. Older app builds ignore unknown message types, so this
// is safe to call before every user has updated the app.
export function haptic(style: HapticStyle = 'light') {
  postToNative({ type: 'HAPTIC', style });
}

// While `active`, the app's Android Back button calls onBack instead of
// navigating. For sheets that can't use useBackToClose (history-based)
// because they router.replace() while open, e.g. the catalog filters.
// No-op in the browser and in app builds that predate BACK_INTERCEPT.
export function useNativeBackHandler(active: boolean, onBack: () => void) {
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  useEffect(() => {
    if (!active || !isNativeApp()) return;
    const handler = () => onBackRef.current();
    window.addEventListener('fastget:back', handler);
    postToNative({ type: 'BACK_INTERCEPT', active: true });
    return () => {
      window.removeEventListener('fastget:back', handler);
      postToNative({ type: 'BACK_INTERCEPT', active: false });
    };
  }, [active]);
}
