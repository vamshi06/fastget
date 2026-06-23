import { useEffect, useRef, useState } from 'react';
import { BackHandler, Linking, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import WebView, { WebViewNavigation } from 'react-native-webview';
import ErrorScreen from '../components/ErrorScreen';
import LoadingScreen from '../components/LoadingScreen';
import { APP_URL } from '../constants/config';

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
// payment-app + Android intent set Razorpay uses — NOT a blanket "open anything
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

// A page-supplied URL (e.g. the invoice PDF) may only be opened externally if it
// belongs to our own origin — blocks file://, javascript:, data: and third-party
// links. Checking the APP_URL prefix + '/' avoids the fastget.in.evil.com bypass.
function isOwnOriginUrl(url: unknown): url is string {
  return typeof url === 'string' && url.startsWith(`${APP_URL}/`);
}

export default function WebViewScreen() {
  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [webViewSource, setWebViewSource] = useState({ uri: APP_URL });

  useEffect(() => {
    const handleDeepLink = (rawUrl: string) => {
      const path = getInternalPath(rawUrl);
      if (path) setWebViewSource({ uri: `${APP_URL}/${path}` });
    };

    Linking.getInitialURL().then((url) => { if (url) handleDeepLink(url); });
    const sub = Linking.addEventListener('url', ({ url }) => handleDeepLink(url));
    return () => sub.remove();
  }, []);

  // Android hardware back button: navigate back in WebView history first.
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const onBackPress = () => {
      if (canGoBack) {
        webViewRef.current?.goBack();
        return true; // consumed — prevent app exit
      }
      return false; // let the OS handle (exit app)
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [canGoBack]);

  const handleRetry = () => {
    setHasError(false);
    setInitialLoading(true);
    webViewRef.current?.reload();
  };

  const handleNavigationStateChange = (navState: WebViewNavigation) => {
    setCanGoBack(navState.canGoBack);
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

    if (
      url.startsWith('http://') ||
      url.startsWith('https://') ||
      url.startsWith('about:')
    ) {
      return true; // let WebView handle normal URLs
    }
    // Hand off only known UPI / payment-app / intent schemes to the OS. Any other
    // scheme (file:, javascript:, tel:, unknown custom apps) is ignored.
    const lower = url.toLowerCase();
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

  return (
    // edges={['top']} keeps the status bar area clear while letting the WebView
    // extend edge-to-edge at the bottom so the site's own layout can manage it.
    <SafeAreaView style={styles.container} edges={['top']}>
      {hasError ? (
        <ErrorScreen onRetry={handleRetry} />
      ) : (
        <View style={styles.webViewContainer}>
          <WebView
            ref={webViewRef}
            source={webViewSource}
            style={styles.webView}
            userAgent={Platform.OS === 'android' ? ANDROID_UA : undefined}
            injectedJavaScript={injectedJavaScript}
            javaScriptCanOpenWindowsAutomatically={false}
            onLoadStart={() => setHasError(false)}
            onLoadEnd={() => setInitialLoading(false)}
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
            onMessage={(event) => {
              try {
                const msg = JSON.parse(event.nativeEvent.data);
                if (msg.type === 'DOWNLOAD_PDF' && isOwnOriginUrl(msg.url)) {
                  // Opens the PDF URL via the OS (only our own-origin URLs):
                  // Android → Download Manager saves the file to Downloads
                  // iOS → Safari opens it as a PDF with share/print options
                  Linking.openURL(msg.url);
                }
              } catch {}
            }}
            javaScriptEnabled
            domStorageEnabled
            // iOS swipe-back gesture
            allowsBackForwardNavigationGestures
            // Pull-to-refresh inside the WebView
            pullToRefreshEnabled
            // Allow cookies & session storage to persist across reloads
            sharedCookiesEnabled
          />
          {/* Splash overlay only on first launch — dismissed once the initial page loads */}
          {initialLoading && (
            <View style={StyleSheet.absoluteFill}>
              <LoadingScreen message="Loading FastGet..." />
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a56db',
  },
  webViewContainer: {
    flex: 1,
  },
  webView: {
    flex: 1,
  },
});
