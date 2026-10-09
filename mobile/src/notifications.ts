import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';

// Push notifications (order status updates). The site asks for the token once
// a customer is signed in (PUSH_REGISTER, see NativeShellBridge.tsx) and
// registers it with its API; the server sends via Expo (src/lib/push.ts).

// Must match ORDER_CHANNEL_ID in src/lib/push.ts.
const ORDER_CHANNEL_ID = 'orders';

// Show pushes that arrive while the app is open too, not only in the background.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let channelReady: Promise<unknown> | null = null;
let promptedThisLaunch = false;

function ensureChannel() {
  if (Platform.OS !== 'android') return Promise.resolve();
  // Android 8+ needs a channel; it is what the user sees under the app's
  // notification settings. HIGH = heads-up banner with sound.
  channelReady ??= Notifications.setNotificationChannelAsync(ORDER_CHANNEL_ID, {
    name: 'Order updates',
    importance: Notifications.AndroidImportance.HIGH,
    lightColor: '#F5A623',
  }).catch(() => {});
  return channelReady;
}

/**
 * Ask for notification permission (Android 13+ shows a prompt the first time;
 * after a refusal Android stops asking and this resolves null) and return this
 * install's Expo push token. Null when not allowed or unavailable.
 */
export async function getPushToken(): Promise<string | null> {
  try {
    await ensureChannel();
    let { status } = await Notifications.getPermissionsAsync();
    // The site asks again on every full page load - prompt at most once per launch.
    if (status !== 'granted' && !promptedThisLaunch) {
      promptedThisLaunch = true;
      ({ status } = await Notifications.requestPermissionsAsync());
    }
    if (status !== 'granted') return null;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return data;
  } catch {
    // e.g. no Google Play services, or Firebase not configured in this build.
    return null;
  }
}

/** In-app path a tapped notification should open, if it carries a safe one. */
export function pathFromResponse(response: Notifications.NotificationResponse | null): string | null {
  const url = response?.notification.request.content.data?.url;
  return typeof url === 'string' && url.startsWith('/') && !url.startsWith('//') ? url : null;
}
