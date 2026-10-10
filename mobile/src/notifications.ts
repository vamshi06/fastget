import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import type * as NotificationsModule from 'expo-notifications';

// Push notifications (order status updates). The site asks for the token once
// a customer is signed in (PUSH_REGISTER, see NativeShellBridge.tsx) and
// registers it with its API; the server sends via Expo (src/lib/push.ts).

// Expo Go (SDK 53+) throws on Android as soon as expo-notifications is even
// imported, so only load it in real builds. In Expo Go push is simply off.
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
const Notifications: typeof NotificationsModule | null = isExpoGo
  ? null
  : require('expo-notifications');

// Must match ORDER_CHANNEL_ID in src/lib/push.ts.
const ORDER_CHANNEL_ID = 'orders';

// Show pushes that arrive while the app is open too, not only in the background.
Notifications?.setNotificationHandler({
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
  if (!Notifications || Platform.OS !== 'android') return Promise.resolve();
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
  if (!Notifications) return null;
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
function pathFromResponse(response: NotificationsModule.NotificationResponse | null): string | null {
  const url = response?.notification.request.content.data?.url;
  return typeof url === 'string' && url.startsWith('/') && !url.startsWith('//') ? url : null;
}

/**
 * Call `onOpen` with the in-app path of a tapped notification - the one that
 * launched the app (coldStart) and any tapped while it runs. Each notification
 * is reported once. Returns an unsubscribe function.
 */
export function listenForNotificationTaps(
  onOpen: (path: string, coldStart: boolean) => void,
): () => void {
  if (!Notifications) return () => {};
  let lastHandled: string | null = null;
  const open = (response: NotificationsModule.NotificationResponse | null, coldStart: boolean) => {
    const target = pathFromResponse(response);
    const id = response?.notification.request.identifier ?? null;
    if (!target || id === lastHandled) return;
    lastHandled = id;
    onOpen(target, coldStart);
  };

  Notifications.getLastNotificationResponseAsync().then((r) => open(r, true)).catch(() => {});
  const sub = Notifications.addNotificationResponseReceivedListener((r) => open(r, false));
  return () => sub.remove();
}
