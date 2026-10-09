# Push Notifications Setup (Android app)

Customers who are signed in to the FastGet Android app get a push notification
when their order status changes:

| Status set by admin | Notification |
|---|---|
| ETA assigned | "Order confirmed ✅" + estimated delivery |
| Out for delivery | "Out for delivery 🚚" |
| Delivered | "Order delivered 🎉" |
| Cancelled | "Order cancelled" |

Tapping a notification opens that order's page in the app. Text is in English or
Hindi, following the language the customer had selected in the app.

**Staff:** every phone where an admin or agent is signed in to the app (and allowed
notifications) also gets a **"🛒 New order placed"** push when any order comes in
(₹total · Urgent/Scheduled · COD/RAZORPAY · customer name; the title says "⚠ check stock"
when stock is short). Tapping opens the order in the admin panel. This is sent alongside
the existing Telegram + email alerts (`src/lib/order-notifications.ts`), not instead of them.

## How it works

```
App (mobile/)                      Site                               Expo / Firebase
─────────────                      ────                               ───────────────
customer signs in  ◄─ PUSH_REGISTER ─ NativeShellBridge
permission prompt
Expo push token    ── fastget:push-token ─► POST /api/push/register
                                            → push_tokens table
                                   admin changes status
                                   /api/orders/update
                                   → src/lib/push.ts  ───────────────► exp.host push API
                                                                        → FCM → phone
```

- Tokens: `push_tokens` table (`db/migrations/026_create_push_tokens.sql`).
- Logout deletes the device's token, so a shared phone stops getting the previous user's notifications.
- Uninstalled apps are removed automatically (Expo reports `DeviceNotRegistered`).
- Guest orders (not signed in) get no push.
- Sending is best-effort: if push fails, the status update still succeeds.

## One-time setup

### 1. Create a Firebase project (free)

1. Go to <https://console.firebase.google.com> → **Add project** → name it `FastGet`
   (Google Analytics is optional; you can turn it off).
2. In the project, click the **Android** icon (**Add app**):
   - **Android package name:** `in.fastget.app` (must match exactly)
   - Nickname: `FastGet`. Skip the SHA-1.
3. Click **Download google-services.json**.
4. Put the file at `mobile/google-services.json` (next to `app.json`) and **commit it**.
   It isn't a secret, and EAS Build needs it in the repo. `app.json` already points to it.
   Skip the remaining Firebase "add SDK" steps; Expo handles them.

### 2. Give Expo permission to send through Firebase (FCM V1 key)

1. Firebase console → ⚙ **Project settings** → **Service accounts** tab →
   **Generate new private key** → this downloads a JSON file.
   **This file IS secret: never commit it.** Store it somewhere safe.
2. Upload it to Expo, using either method:
   - **Dashboard:** <https://expo.dev> → project **fastget** → **Credentials** → **Android** →
     `in.fastget.app` → **FCM V1 service account key** → **Add a service account key** → upload the JSON.
   - **CLI:** `cd mobile && eas credentials` → Android → production →
     *Google Service Account* → *Manage your Google Service Account Key for Push Notifications (FCM V1)* → upload.

### 3. Run the database migration

```bash
npm run sync-schema
```

This creates the `push_tokens` table (migration 026). Without it, registering fails
quietly and no pushes are sent. Nothing else breaks.

### 4. Deploy the site

Push to Railway as usual. No new env vars are needed.
(Optional: if you later turn on **Enhanced push security** in the Expo project settings,
add `EXPO_ACCESS_TOKEN` to Railway Variables.)

### 5. Build and release a new app version

`expo-notifications` is a new native module, so this **needs a new EAS build**.
An OTA update is not enough.

1. In `mobile/app.json`, bump `android.versionCode` (currently 13 → 14) and `version`.
2. Test build first (installable APK):
   ```bash
   cd mobile
   eas build -p android --profile preview
   ```
3. When it works: `eas build -p android --profile production`, then upload to Play Console.

Users on the old app version keep working normally; they just don't get pushes
until they update.

## Testing

1. Install the preview APK on a **real phone** (emulators often can't get push tokens).
2. Sign in as a customer → Android asks **"Allow FastGet to send you notifications?"** → Allow.
3. Check the token was saved:
   ```sql
   SELECT user_id, token, locale, updated_at FROM push_tokens ORDER BY updated_at DESC;
   ```
4. Place an order, then in **Admin → Orders** set an ETA → the phone should buzz within a few seconds.
   Try with the app open, in the background, and fully closed. Tapping should open the order page.
5. Sending a test without the site: paste a token from step 3 into <https://expo.dev/notifications>.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| No row in `push_tokens` | Notification permission denied (Android Settings → Apps → FastGet → Notifications), migration 026 not run, or the app is an old build. |
| Row exists but nothing arrives | FCM V1 key not uploaded to Expo (step 2). Railway logs show `Push ticket error`, often `InvalidCredentials`. |
| EAS build fails: `google-services.json` missing | File not at `mobile/google-services.json`, or not committed. |
| Notification icon is a grey/white square | Android needs a monochrome icon. Optional: add a white-on-transparent 96×96 PNG and set `"icon": "./assets/notification-icon.png"` in the `expo-notifications` plugin in `app.json`. |
| Customer chose "Don't allow" | The app only asks once per launch, and Android stops asking after two refusals. The customer must enable it in Android settings. |

## Code map

- `mobile/src/notifications.ts`: permission, channel (`orders`), token, tap → path
- `mobile/src/screens/WebViewScreen.tsx`: `PUSH_REGISTER` handler; opens the tapped notification's page
- `src/components/NativeShellBridge.tsx`: asks the app for the token when signed in, then registers it
- `src/app/api/push/register/route.ts`: saves token for the session user
- `src/app/api/auth/logout/route.ts`: deletes the device's token on logout
- `src/lib/push.ts`: sends via Expo; message text lives in `messages/{en,hi}/order.json` → `push`
- `src/app/api/orders/update/route.ts`: triggers the push after a status change
