import { useEffect, useRef } from 'react';

// Bridge to the Expo wrapper app (mobile/). react-native-webview injects
// window.ReactNativeWebView into every page it loads, so its presence is how
// the site knows it's running inside the app rather than a browser.

type HapticStyle = 'light' | 'medium' | 'success' | 'error';

type NativeMessage =
  | { type: 'HAPTIC'; style: HapticStyle }
  | { type: 'BACK_INTERCEPT'; active: boolean }
  | { type: 'SHARE_TEXT'; text: string }
  | { type: 'DOWNLOAD_PDF'; url: string };

export function isNativeApp(): boolean {
  return typeof window !== 'undefined' && !!(window as any).ReactNativeWebView;
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
