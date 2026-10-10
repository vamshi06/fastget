import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, BackHandler, Easing, Keyboard, Linking, Platform, Share, StyleSheet, useColorScheme, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationBar } from 'expo-navigation-bar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { darkColors, lightColors, ShellColorsContext } from '../shell/theme';
import * as Haptics from 'expo-haptics';
import { getPushToken, listenForNotificationTaps } from '../notifications';
import WebView, { WebViewNavigation } from 'react-native-webview';
import ErrorScreen from '../components/ErrorScreen';
import LoadingScreen from '../components/LoadingScreen';
import { APP_URL } from '../constants/config';
import CartPill, { CART_PILL_SPACE, CartSummary } from '../shell/CartPill';
import TabBar from '../shell/TabBar';
import TopBar from '../shell/TopBar';
import { getActiveTab, getRouteKind, pathOf, showsCartPill, showsCartShortcut, TabKey } from '../shell/routes';

const SCHEME = 'fastget://';

type WebViewRequest = {
  url: string;
};

function getInternalPath(rawUrl: string): string | null {
  if (rawUrl.startsWith(SCHEME)) {
    return rawUrl.slice(SCHEME.length);
  }

  if (rawUrl.startsWith(`${APP_URL}/`)) {
    return rawUrl.slice(APP_URL.length + 1);
  }

  if (rawUrl.startsWith('exp://') && rawUrl.includes('/--/')) {
    return rawUrl.split('/--/')[1] ?? null;
  }

  return null;
}

// Only these non-web schemes may be handed to the OS (M3). This is the UPI /
// payment-app + Android intent set Razorpay uses - NOT a blanket "open anything
// that isn't http", which would let a page launch tel:, sms:, file:, or arbitrary
// custom-scheme apps.
const ALLOWED_EXTERNAL_SCHEMES = [
  'upi://',
  'intent://',
  'tez://', // Google Pay
  'phonepe://',
  'paytmmp://',
  'gpay://',
  'credpay://',
  'bhim://',
];

const WHATSAPP_HOSTS = new Set(['wa.me', 'api.whatsapp.com']);

function isWhatsAppUrl(url: string): boolean {
  if (url.toLowerCase().startsWith('whatsapp://')) return true;
  const match = /^https:\/\/([^/?#]+)/i.exec(url);
  return !!match && WHATSAPP_HOSTS.has(match[1].toLowerCase());
}

// A page-supplied URL (e.g. the invoice PDF) may only be opened externally if it
// belongs to our own origin - blocks file://, javascript:, data: and third-party
// links. Checking the APP_URL prefix + '/' avoids the fastget.in.evil.com bypass.
function isOwnOriginUrl(url: unknown): url is string {
  return typeof url === 'string' && url.startsWith(`${APP_URL}/`);
}

// Sent by the site's haptic() helper (src/lib/native-bridge.ts).
// Uses Android's own View.performHapticFeedback (not the raw vibrator), so it
// matches system UI feel and respects the user's "touch feedback" setting.
// CONFIRM / REJECT only exist on Android 11+ (API 30); older versions fall
// back to the long-press pattern so success/error still feel distinct.
const HAS_CONFIRM_REJECT = Platform.OS === 'android' && (Platform.Version as number) >= 30;

function playHaptic(style: unknown) {
  const { AndroidHaptics } = Haptics;
  const type =
    style === 'success' ? (HAS_CONFIRM_REJECT ? AndroidHaptics.Confirm : AndroidHaptics.Long_Press)
    : style === 'error' ? (HAS_CONFIRM_REJECT ? AndroidHaptics.Reject : AndroidHaptics.Long_Press)
    : style === 'medium' ? AndroidHaptics.Long_Press
    : AndroidHaptics.Virtual_Key;
  Haptics.performAndroidHapticsAsync(type).catch(() => {});
}

// Tells the site this app draws its own chrome (native shell). Runs at page
// start; the cookie is what the site's head script reads on later loads, as
// this isn't guaranteed to run before it on Android. See src/lib/shell-routes.ts.
// __FASTGET_CAPS__ lists what this build can do beyond the shell, so the site
// only offers those features here (e.g. 'whatsapp' = wa.me links open
// WhatsApp - see handleShouldStartLoadWithRequest; src/lib/contact.ts).
const SHELL_BOOTSTRAP = `
  window.__FASTGET_SHELL__ = 2;
  window.__FASTGET_CAPS__ = ['whatsapp'];
  document.cookie = 'fg_shell=2; path=/; max-age=2592000; SameSite=Lax';
  true;
`;

type Direction = 'forward' | 'back' | 'tab';

export default function WebViewScreen() {
  const webViewRef = useRef<WebView>(null);
  const insets = useSafeAreaInsets();
  const [canGoBack, setCanGoBack] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [webViewSource, setWebViewSource] = useState({ uri: APP_URL });

  // ── Native shell state, fed by the site (NativeShellBridge.tsx) ──
  // The chrome only appears once the site says it supports it (SHELL_CONFIG),
  // so this build still works against a site deployed before the shell.
  const [shellReady, setShellReady] = useState(false);
  const [path, setPath] = useState('/');
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [labels, setLabels] = useState<Partial<Record<TabKey, string>>>({});
  const [cart, setCart] = useState<CartSummary | null>(null);
  const cartCount = cart?.count ?? 0;
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  // Light/dark: what the page is showing (THEME message - the user may have
  // picked Dark on a light phone), else the phone setting until it reports.
  const systemScheme = useColorScheme();
  const [siteTheme, setSiteTheme] = useState<'light' | 'dark' | null>(null);
  const isDark = (siteTheme ?? systemScheme) === 'dark';
  const colors = isDark ? darkColors : lightColors;
  const pathRef = useRef<string | null>(null);
  // How the next path change happened, for the transition. Unset = the page
  // navigated itself (a link tap), which is a forward push.
  const pendingDirection = useRef<Direction | null>(null);
  // Sheets currently open in the page that Back should close (BACK_INTERCEPT,
  // see useNativeBackHandler in native-bridge.ts). A count, in case two overlap.
  const backIntercepts = useRef(0);

  // Screen transition: new screens slide in from the right, Back slides from
  // the left, tab switches crossfade. Opacity + translate only, native driver.
  const slide = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;

  const animateTransition = useCallback((direction: Direction) => {
    const easing = Easing.out(Easing.cubic);
    if (direction === 'tab') {
      slide.setValue(0);
      fade.setValue(0.35);
      Animated.timing(fade, { toValue: 1, duration: 180, easing, useNativeDriver: true }).start();
      return;
    }
    slide.setValue(direction === 'back' ? -40 : 40);
    fade.setValue(0.4);
    Animated.parallel([
      Animated.timing(slide, { toValue: 0, duration: 240, easing, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: 200, easing, useNativeDriver: true }),
    ]).start();
  }, [fade, slide]);

  useEffect(() => {
    const handleDeepLink = (rawUrl: string) => {
      const path = getInternalPath(rawUrl);
      if (path) setWebViewSource({ uri: `${APP_URL}/${path}` });
    };

    Linking.getInitialURL().then((url) => { if (url) handleDeepLink(url); });
    const sub = Linking.addEventListener('url', ({ url }) => handleDeepLink(url));
    return () => sub.remove();
  }, []);

  // Tapped push notification -> open the screen it points at (the order page).
  // Cold start: load that page directly. App already running: navigate in
  // the site. Deduped by id, as both paths can report the launching tap.
  const shellReadyRef = useRef(false);
  shellReadyRef.current = shellReady;
  useEffect(() => {
    return listenForNotificationTaps((target, coldStart) => {
      if (!coldStart && shellReadyRef.current) {
        pendingDirection.current = 'forward';
        webViewRef.current?.injectJavaScript(
          `window.dispatchEvent(new CustomEvent('fastget:navigate', { detail: { path: ${JSON.stringify(target)} } })); true;`,
        );
      } else {
        setWebViewSource({ uri: `${APP_URL}${target}` });
      }
    });
  }, []);

  // The tab bar would ride up on top of the keyboard - hide it while typing.
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const inject = useCallback((js: string) => {
    webViewRef.current?.injectJavaScript(`${js}; true;`);
  }, []);

  // Client-side navigation in the site (no page reload) via NativeShellBridge.
  const navigate = useCallback((to: string, direction: Direction) => {
    pendingDirection.current = direction;
    inject(`window.dispatchEvent(new CustomEvent('fastget:navigate', { detail: { path: ${JSON.stringify(to)} } }))`);
  }, [inject]);

  // Shared by the hardware Back button and the top bar's back arrow.
  // Follows Android's model: Back on a top-level tab returns to Home, and Back
  // on Home leaves the app; inside a flow it walks back through history.
  const handleBack = useCallback((): boolean => {
    if (backIntercepts.current > 0) {
      // Let the page close its open sheet instead of leaving the screen.
      inject("window.dispatchEvent(new Event('fastget:back'))");
      return true;
    }
    if (shellReady) {
      const kind = getRouteKind(path);
      if (kind === 'tab') {
        if (path !== '/') {
          navigate('/', 'tab');
          return true;
        }
        return false; // Home: let the OS close the app
      }
      if (!canGoBack && kind === 'sub') {
        // Opened straight into a sub-page (deep link) - Back goes Home.
        navigate('/', 'back');
        return true;
      }
    }
    if (canGoBack) {
      pendingDirection.current = 'back';
      webViewRef.current?.goBack();
      return true; // consumed - prevent app exit
    }
    return false; // let the OS handle (exit app)
  }, [canGoBack, inject, navigate, path, shellReady]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', handleBack);
    return () => sub.remove();
  }, [handleBack]);

  const handleTabPress = useCallback((_key: TabKey, to: string) => {
    if (to === path) {
      // Re-tapping the current tab scrolls it back to the top, as native apps do.
      inject("window.scrollTo({ top: 0, behavior: 'smooth' })");
      return;
    }
    navigate(to, 'tab');
  }, [inject, navigate, path]);

  const handleRetry = () => {
    setHasError(false);
    setInitialLoading(true);
    webViewRef.current?.reload();
  };

  const handleNavigationStateChange = (navState: WebViewNavigation) => {
    setCanGoBack(navState.canGoBack);

    // Fires for client-side (pushState) navigations too, so the chrome
    // follows every route change. Query-only changes (filters) don't count.
    const next = pathOf(navState.url, APP_URL);
    if (next && next !== pathRef.current) {
      const isFirst = pathRef.current === null;
      pathRef.current = next;
      setPath(next);
      if (!isFirst && shellReady) animateTransition(pendingDirection.current ?? 'forward');
      pendingDirection.current = null;
    }
  };

  const handleMessage = (data: string) => {
    let msg: any;
    try {
      msg = JSON.parse(data);
    } catch {
      return;
    }
    switch (msg?.type) {
      case 'SHELL_CONFIG':
        setShellReady(true);
        if (msg.labels && typeof msg.labels === 'object') setLabels(msg.labels);
        break;
      case 'ROUTE':
        if (typeof msg.path === 'string' && typeof msg.title === 'string') {
          setTitles((prev) => (prev[msg.path] === msg.title ? prev : { ...prev, [msg.path]: msg.title }));
        }
        break;
      case 'CART_COUNT':
        if (typeof msg.count === 'number') {
          setCart({
            count: msg.count,
            itemsLabel: typeof msg.itemsLabel === 'string' ? msg.itemsLabel : `${msg.count}`,
            totalLabel: typeof msg.totalLabel === 'string' ? msg.totalLabel : '',
            hint: typeof msg.hint === 'string' ? msg.hint : undefined,
            cta: typeof msg.cta === 'string' ? msg.cta : 'View cart',
          });
        }
        break;
      case 'THEME':
        if (msg.theme === 'light' || msg.theme === 'dark') setSiteTheme(msg.theme);
        break;
      case 'HAPTIC':
        playHaptic(msg.style);
        break;
      case 'BACK_INTERCEPT':
        backIntercepts.current = Math.max(0, backIntercepts.current + (msg.active === true ? 1 : -1));
        break;
      case 'DOWNLOAD_PDF':
        // Opens the PDF URL via the OS (only our own-origin URLs):
        // Android → Download Manager saves the file to Downloads
        if (isOwnOriginUrl(msg.url)) Linking.openURL(msg.url);
        break;
      case 'PUSH_REGISTER':
        // Signed in on the site - hand it this install's push token to
        // register (may show Android's notification permission prompt).
        getPushToken().then((token) => {
          if (token) {
            inject(`window.dispatchEvent(new CustomEvent('fastget:push-token', { detail: { token: ${JSON.stringify(token)} } }))`);
          }
        });
        break;
      case 'SHARE_TEXT':
        // Referral "Share with friends" - the WebView has no
        // navigator.share, so open the native share sheet instead.
        if (typeof msg.text === 'string' && msg.text.length <= 1000) {
          Share.share({ message: msg.text }).catch(() => {});
        }
        break;
    }
  };

  // Hand off UPI deep links and intent:// URLs to the OS so Razorpay's UPI
  // flow can open GPay / PhonePe / Paytm natively. Without this, Razorpay
  // detects the WebView environment and hides the UPI payment option entirely.
  const handleShouldStartLoadWithRequest = (request: WebViewRequest): boolean => {
    const { url } = request;

    // Keep fastget.in URLs in the WebView (including target="_blank" and window.open)
    if (url.startsWith(`${APP_URL}/`) || url === APP_URL) {
      return true;
    }

    // "Chat on WhatsApp" links: hand to Android, which opens WhatsApp (or the
    // browser if it isn't installed) - inside the WebView they'd only show
    // WhatsApp's web page.
    if (isWhatsAppUrl(url)) {
      Linking.openURL(url).catch(() => {});
      return false;
    }

    if (
      url.startsWith('http://') ||
      url.startsWith('https://') ||
      url.startsWith('about:')
    ) {
      return true; // let WebView handle normal URLs
    }
    // tel: is handled explicitly (not folded into ALLOWED_EXTERNAL_SCHEMES, which is
    // a UPI/payment-app allowlist) so "Call Support" reliably opens the dialer on
    // every Android WebView provider instead of relying on inconsistent OEM fallback
    // behavior for unrecognized schemes when this handler returns false.
    const lower = url.toLowerCase();
    if (lower.startsWith('tel:')) {
      Linking.openURL(url).catch(() => {});
      return false;
    }

    // Hand off only known UPI / payment-app / intent schemes to the OS. Any other
    // scheme (file:, javascript:, unknown custom apps) is ignored.
    if (ALLOWED_EXTERNAL_SCHEMES.some((scheme) => lower.startsWith(scheme))) {
      Linking.openURL(url).catch(() => {});
    }
    return false;
  };

  // Android WebViews append " wv" to the User-Agent header on every HTTP request.
  // Razorpay's servers read this header and hide UPI server-side when they see it.
  // JS-based UA overrides don't affect HTTP headers, so we set the actual UA via prop.
  // We use a standard Chrome Mobile UA (no "wv") only on Android; iOS is unaffected.
  const ANDROID_UA =
    'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';

  // Injected JavaScript to intercept window.open() and target="_blank" links,
  // keeping all fastget.in URLs within the WebView instead of opening external browser.
  const injectedJavaScript = `
    (function() {
      // Override window.open to navigate in the same window
      window.open = function(url, target, features) {
        if (url) {
          window.location.href = url;
        }
      };
    })();
    true;
  `;

  const routeKind = shellReady ? getRouteKind(path) : null;
  const pillVisible = shellReady && cartCount > 0 && !keyboardVisible && showsCartPill(path);

  // Ask the page to leave room under its content while the pill floats over
  // it (globals.css --shell-overlay). Re-sent after every full page load.
  const overlayRef = useRef('0px');
  overlayRef.current = pillVisible ? `${CART_PILL_SPACE}px` : '0px';
  const syncOverlay = useCallback(() => {
    inject(`document.documentElement.style.setProperty('--shell-overlay', '${overlayRef.current}')`);
  }, [inject]);
  useEffect(() => {
    syncOverlay();
  }, [pillVisible, syncOverlay]);

  return (
    // With the native shell the WebView stops above the system nav bar (the
    // bottom edge is ours: tab bar or white inset). Without it - a site from
    // before the shell - the page runs edge-to-edge and manages that itself.
    <ShellColorsContext.Provider value={colors}>
    <SafeAreaView style={[styles.container, { backgroundColor: colors.surface }]} edges={shellReady ? ['bottom'] : []}>
      {/* Status-bar strip: brand orange over the tab screens' orange header
          (orange in both themes), else the native top bar's surface colour. */}
      <StatusBar style={routeKind === 'tab' || !isDark ? 'dark' : 'light'} />
      {/* System nav bar buttons/gesture handle: follow the page, not the phone,
          so Dark on a light phone doesn't leave dark buttons on a dark bar. */}
      <NavigationBar style={isDark ? 'light' : 'dark'} />
      <View style={{ height: insets.top, backgroundColor: routeKind === 'tab' ? colors.headerTop : colors.surface }} />
      {hasError ? (
        <ErrorScreen onRetry={handleRetry} />
      ) : (
        <>
          {routeKind === 'sub' && (
            <TopBar
              title={titles[path] ?? ''}
              cartCount={cartCount}
              showCart={showsCartShortcut(path)}
              onBack={handleBack}
              onCart={() => navigate('/cart', 'forward')}
            />
          )}

          <View style={styles.webViewContainer}>
          <Animated.View style={[styles.webViewContainer, { opacity: fade, transform: [{ translateX: slide }] }]}>
            <WebView
              ref={webViewRef}
              source={webViewSource}
              style={[styles.webView, { backgroundColor: colors.page }]}
              userAgent={Platform.OS === 'android' ? ANDROID_UA : undefined}
              injectedJavaScript={injectedJavaScript}
              injectedJavaScriptBeforeContentLoaded={SHELL_BOOTSTRAP}
              javaScriptCanOpenWindowsAutomatically={false}
              onLoadStart={() => {
                setHasError(false);
                backIntercepts.current = 0; // full page load: no sheet open
              }}
              onLoadEnd={() => {
                setInitialLoading(false);
                syncOverlay();
              }}
              onError={() => {
                setHasError(true);
                setInitialLoading(false);
              }}
              onHttpError={({ nativeEvent }) => {
                // Only treat 5xx as fatal; 4xx may still render a page from the app.
                if (nativeEvent.statusCode >= 500) {
                  setHasError(true);
                  setInitialLoading(false);
                }
              }}
              onNavigationStateChange={handleNavigationStateChange}
              onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
              // Only our own pages may talk to the shell - other https pages
              // can load in this WebView (e.g. Razorpay), and must not be able
              // to ask for this device's push token or drive the native UI.
              onMessage={(event) => {
                const { url, data } = event.nativeEvent;
                if (url === APP_URL || url.startsWith(`${APP_URL}/`)) handleMessage(data);
              }}
              javaScriptEnabled
              domStorageEnabled
              // Checkout's "Use my current location" (site pin for the driver).
              // Android asks the customer for location permission on first use.
              geolocationEnabled
              // Pull-to-refresh inside the WebView
              pullToRefreshEnabled
              // Android: no blue edge-glow when scrolling past the top/bottom
              overScrollMode="never"
              // Hide the WebView's own scrollbars, like a native list
              showsVerticalScrollIndicator={false}
              showsHorizontalScrollIndicator={false}
              // Allow cookies & session storage to persist across reloads
              sharedCookiesEnabled
            />
          </Animated.View>

          {/* Outside the transition so it stays put while screens slide */}
          {pillVisible && cart && (
            <CartPill summary={cart} onPress={() => navigate('/cart', 'forward')} />
          )}
          </View>

          {routeKind === 'tab' && !keyboardVisible && (
            <TabBar
              active={getActiveTab(path)}
              labels={labels}
              onPress={handleTabPress}
            />
          )}

          {/* Splash overlay only on first launch - dismissed once the initial page loads */}
          {initialLoading && (
            <View style={StyleSheet.absoluteFill}>
              <LoadingScreen />
            </View>
          )}
        </>
      )}
    </SafeAreaView>
    </ShellColorsContext.Provider>
  );
}

const styles = StyleSheet.create({
  // Background (colors.surface) fills the bottom inset under the native bars.
  container: {
    flex: 1,
  },
  webViewContainer: {
    flex: 1,
  },
  webView: {
    flex: 1,
  },
});
