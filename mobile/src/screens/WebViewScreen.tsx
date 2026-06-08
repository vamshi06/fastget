import { useEffect, useRef, useState } from 'react';
import { BackHandler, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import WebView, { WebViewNavigation } from 'react-native-webview';
import ErrorScreen from '../components/ErrorScreen';
import LoadingScreen from '../components/LoadingScreen';
import { APP_URL } from '../constants/config';

export default function WebViewScreen() {
  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

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
            source={{ uri: APP_URL }}
            style={styles.webView}
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
