# Analytics setup (PostHog + Play Console)

Two questions, two tools:

| Question | Where to look |
|---|---|
| How many people installed / uninstalled the app? | **Google Play Console** (no code) |
| Where do people drop off, and why? | **PostHog** (funnels, retention, session replay) |

The code is already in place (`src/lib/analytics.ts`). It does nothing until
`NEXT_PUBLIC_POSTHOG_KEY` is set. The Android app loads the website, so the
website tracking covers both. No new app build is needed.

---

## 1. Create the PostHog project *(done 2026-10-10)*

- Signed in with the office GitHub account.
- Project "FastGet Production" is on the **US** cloud (`us.posthog.com`).
- Project API key (`phc_...`) is under **Settings → Project → General**.
  It's public and meant to be in the browser.
- Tested on localhost: events arrive.

## 2. Add the env vars on Railway

Railway → FastGet service → **Variables**:

```
NEXT_PUBLIC_POSTHOG_KEY=phc_xxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_POSTHOG_REGION=us        # our project is on us.posthog.com
```

Then **redeploy** (a full build, not a restart). `NEXT_PUBLIC_*` values are
baked in at build time.

For local testing, add the same two lines to `.env.local` and restart `npm run dev`.

## 3. PostHog settings to change once

All of these are under **Settings** (bottom-left of PostHog). If a setting
isn't where this says, type its name into **Search settings...**. PostHog
moves things around between versions.

### 3a. To do

- [ ] **Project → Autocapture**
  - **Autocapture** (web): ON. It records taps, so replays and heatmaps work.
  - **Rage clicks** / **Dead clicks**: ON. These are frustration signals:
    repeated taps on something that doesn't respond, or taps that do nothing.
  - **Heatmaps** (may be its own toggle here or under Products → Heatmaps): ON.
  - **Web vitals**: ON if offered. It shows slow pages, and slowness is a
    common reason people leave.
- [ ] **Products → Error tracking → Exception autocapture**: ON.
  JavaScript errors customers hit show up next to their replay.
- [ ] **Products → Product analytics → Person last seen tracking**: ON.
  Shows when each customer was last active, so you can spot who stopped coming.
- [ ] **Filter out internal and test users.** Search settings for `internal`.
  It's usually under Project → General, or open it from the gear icon next
  to the "Filter out internal and test users" toggle in any insight.
  Add **both** filters:
  - Person property `role` **is not** `admin`. Keeps admins testing the store
    out of the numbers. `role` only appears in the list after an admin has
    logged in once with tracking on.
  - Event property `$host` (shown as "Host") **does not contain** `:3000`.
    Keeps dev testing out of the numbers, because it goes into the same
    project. It covers both `localhost:3000` and phone testing over the
    LAN (e.g. `192.168.1.114:3000`).
- Replays of local/LAN sessions show blank product photos. The player
  reloads images from the original `http://` dev address, and the browser
  blocks that on the `https` PostHog page. Replays from `fastget.in` show
  photos normally.
  - Then turn on **"Enable this filter on all new insights"**.
- [ ] **Settings → Organization → Members**: invite teammates by work email.

### 3b. Already done

**Settings → Products → Session replay** *(done 2026-10-10)*
- **Record user sessions:** ON.
- **Capture console logs**, **Capture network requests**, **Header capture**
  and **Capture body:** all OFF. Network capture would record API payloads
  that contain phone numbers and addresses.
- **Minimum duration:** 2 seconds, to skip accidental opens. **Sampling:** 100%.
- **Privacy and masking:** "Normal (mask inputs but not text/images)" is fine.
  Names, addresses and phones are already blanked in code (`ph-no-capture`).
- **Trigger groups**, **URL blocklist** and integrations: leave empty.
- **Data retention:** 30 days (free plan).
- There is no "authorized domains" setting for replay any more. None is needed.

### 3c. Leave alone

- **Product analytics → Person display name** (email / name / username): our
  code never sends these, so people show up as IDs. That's intended.
- Paid add-ons (chart colours, group analytics, longer retention): not needed.

## 4. Check it works

1. Open https://fastget.in (or localhost) and browse: open a product, add it
   to the cart, open the cart.
2. In PostHog, open **Activity**. Within about a minute you should see
   `$pageview`, `product_viewed`, `added_to_cart` and `cart_viewed`.
3. Every event should have `platform` = `web` or `android_app`.
4. A few minutes later the session appears under **Session replay**. Check
   that typed fields show as `***` and saved addresses/names show as blank boxes.

If nothing arrives, open the browser devtools → Network tab and filter by `ingest`.
- A 404 means the redeploy didn't pick up the env var.
- Requests that never appear mean `NEXT_PUBLIC_POSTHOG_KEY` is empty in the build.

## 5. Build the dashboards

### A. Purchase funnel: "where do people leave?"
**Product analytics → New insight → Funnel**, conversion window 1 day:

1. `$pageview`, any page (app opened)
2. `product_viewed`
3. `added_to_cart`
4. `cart_viewed`
5. `checkout_started`
6. `order_placed`

- Set **Breakdown** to `platform` to compare the app with the browser.
- Click any bar → **"View dropped-off persons"** → **"Watch recordings"**.
  This is the "why" part: you watch real sessions of people who quit at that step.

### B. Payment funnel
`checkout_started` → `payment_opened` → `order_placed`.

Also make a **Trends** insight for `payment_dismissed` and `payment_failed`.
- Many dismissals means people back out on the Razorpay screen. That usually
  points to price or delivery-fee surprises, or no COD option.
- Failures mean technical problems.

### C. "What's bothering people?" error tables
Make **Trends** insights, shown as a **table** and broken down by `message`:
- `checkout_error`: validation and payment errors customers actually hit
- `signup_error`: e.g. the strong-password rule rejecting people
- `login_error`: wrong passwords, unverified emails

### D. Missing products
A **Trends** insight on `searched`:
- Filter: `results` = 0
- Breakdown: `query`
- Display as a table

This lists what customers search for that you don't stock.

### E. Sign-in wall
A **Trends** insight comparing `checkout_login_required` with `checkout_started`.
If many guests hit the wall and never come back, account creation is a
drop-off point. Phone login would help here.

### F. Retention: "do they come back?"
**New insight → Retention**:
- First event: `order_placed`
- Return event: `order_placed`
- Weekly

This shows how many buyers order again.

Pin all of these to one **dashboard** ("Customer journey").

## 6. Google Play Console (installs and uninstalls)

Play Console → FastGet:
- **Statistics:** add the metrics *Installed audience*, *User acquisitions*
  and *User losses* (uninstalls), per day.
- **Grow → Store performance → Store listing conversion:** how many people
  saw the listing and how many installed.
- **Quality → Android vitals:** crash and ANR (freeze) rates. Above about 1%
  is a common silent uninstall reason.
- **Quality → Ratings and reviews:** read the 1–3★ reviews. They're free feedback.

Play Console only knows installs. PostHog knows behaviour after install.
Together they cover the whole journey.

## 7. Privacy

- Session replay records screens. Inputs are masked automatically.
  Address, phone, name and email text carries the `ph-no-capture` class,
  so replays blank it out and taps on it are never sent.
- When adding a new screen that shows personal data as plain text, add
  `ph-no-capture` to it.
- Pages whose URL carries a secret (`/order/<token>`, reset/verify links)
  are never recorded. Their URLs are scrubbed from events.
- **Privacy policy** *(done 2026-10-10, en + hi)*: PostHog was added to
  sections 2 (what we collect), 3 (why), 4 (third parties), 5 (cookies) and
  6 (retention). It ships with the analytics deploy.
- If a customer emails asking for their data to be deleted, also delete
  them in PostHog: **People** → search their user ID → **Delete person**.
  This also removes their recordings.

### Play Console → Data safety form (do this after deploying)

Play Console → FastGet → **Policy and programs → App content → Data safety → Manage**.
Keep every existing answer and **add** these:

| Data type | Collected? | Shared? | Required or optional | Purposes |
|---|---|---|---|---|
| **App activity → App interactions** | Yes | No | Required | Analytics |
| **App activity → In-app search history** | Yes | No | Required | Analytics |
| **App info and performance → Crash logs** | Yes | No | Required | Analytics, App functionality |
| **App info and performance → Diagnostics** | Yes | No | Required | Analytics |
| **Device or other IDs** | Yes | No | Required | Analytics, App functionality |
| **Personal info → User IDs** | Yes | No | Required | Analytics, App functionality, Account management |

- **"Shared?" is No.** PostHog is a service provider processing data on our
  behalf, and Google doesn't count that as sharing.
- **User IDs**: logged-in customers' analytics are linked to their FastGet
  account ID. If the form already lists User IDs, just add the Analytics purpose.
- **"Is this data processed ephemerally?"** No, for every row above.
- **"Is data encrypted in transit?"** Yes.
- **"Can users request deletion?"** Yes, through Account → Delete Account
  or by emailing support.
- **Device or other IDs** covers two things: PostHog's random identifier
  (Analytics) and the push-notification token (App functionality). Expo and
  Firebase deliver the notifications as service providers, so they aren't
  "sharing" either.
- After saving, Google reviews the form. It doesn't need a new app build.

## 8. Next app build: location permission + Play Console changes

The next Android build (versionCode **15**) adds two things that need Play
Console updates:

- **Location permission** (`ACCESS_FINE_LOCATION` + `ACCESS_COARSE_LOCATION`
  in `mobile/app.json`). It's used only when a customer taps **"Use my current
  location"** at checkout. The site's pin is saved with the order so the
  driver can open it in Google Maps. It's foreground only: no background
  location, nothing is tracked.
- **WhatsApp links open in WhatsApp** (the "Chat on WhatsApp" buttons). This
  needs no permission and collects no data.

The privacy policy was updated to match *(done 2026-10-10, en + hi)*. It used
to say "we do not collect your device location". It now describes the
checkout location pin, GST details, Google Maps and WhatsApp. **Deploy the
website before submitting the build**, so the live policy matches the app
when Google reviews it.

### 8a. Build and release

1. `mobile/app.json`: set `"versionCode": 15` (and bump `"version"`, e.g. `10.1.0`).
2. Build with EAS as usual and upload the `.aab` to **Release → Production →
   Create new release**. If the push-notifications build is still pending,
   this one build covers both.
3. Suggested release notes ("What's new"):
   ```
   • Use your current location at checkout so our driver finds your site
   • Chat with us on WhatsApp from any product or order
   • Sizes of the same product now grouped together
   ```

### 8b. Data safety form: add location (and GST details)

Play Console → FastGet → **Policy and programs → App content → Data safety → Manage**.
Keep every existing answer and **add**:

| Data type | Collected? | Shared? | Required or optional | Purposes |
|---|---|---|---|---|
| **Location → Precise location** | Yes | No | **Optional** | App functionality |
| **Personal info → Other info** (GSTIN, business name) | Yes | No | **Optional** | App functionality |

- **Optional**, because customers can skip the location button and type the
  address, and GST details are only entered if they want a GST invoice.
- **"Is this data processed ephemerally?"** No. The pin is saved with the order.
- **Shared?** No. The pin is opened in Google Maps by our own staff, and
  Neon only stores it for us, so neither counts as sharing.
- **Approximate location:** we only save the precise pin. If Google's checks
  flag the `ACCESS_COARSE_LOCATION` permission, also tick **Approximate
  location** with the same answers.
- **Personal info → Address** should already be declared for delivery
  addresses. The pincode is part of it, so nothing new is needed there.
- WhatsApp chats happen inside WhatsApp, not our app, so nothing to declare.

### 8c. Other Play Console checks

- **App content → Location permissions / Sensitive permissions:** no
  declaration form is needed, because we don't ask for background location
  (`ACCESS_BACKGROUND_LOCATION`). If Play Console still asks, answer that
  location is used only in the foreground, when the user taps a button at
  checkout, to pin the delivery site.
- **Policy and programs → App content → Privacy policy:** the URL stays
  `https://fastget.in/privacy-policy`. Just make sure the updated version is
  deployed (section 8 above).
- **Pre-launch report** (Release → Testing → Pre-launch report): after
  uploading, check it lists no new permission warnings.
- After the release goes live, the location prompt only appears the first
  time someone taps the location button. Android asks for permission then,
  and a "Deny" still lets them type the address.

### 8d. PostHog: new events to use

Two new events (already in the event reference below). Add them to the
"Customer journey" dashboard:

- **Trends on `reordered`**: how often customers use "Order again".
  Compare with `order_placed` to see what share of orders are repeats.
- **Trends on `whatsapp_chat_opened`**, broken down by `source`
  (`product`, `order`, `support`, `account`): which screens make people ask
  questions. Many `product` chats on one item usually means its description
  or photos are missing something.

## Event reference

Event names are what the funnels are built on. Renaming one breaks its funnel.

| Event | Fired when | Key properties |
|---|---|---|
| `$pageview` | any page/route change (automatic) | `$pathname` |
| `product_viewed` | product page loads | `product_id`, `product_name`, `category`, `price`, `stock_status` |
| `added_to_cart` / `removed_from_cart` | cart changes | product fields, `quantity` |
| `wishlist_added` | heart tapped | `product_id` |
| `searched` | catalog search results load | `query`, `results` |
| `cart_viewed` | cart page | `item_count`, `cart_value` |
| `checkout_login_required` | guest reaches checkout | `item_count` |
| `checkout_started` | signed-in user reaches checkout with items | `item_count`, `cart_value` |
| `checkout_error` | any error shown on checkout | `message`, `payment_method` |
| `payment_opened` / `payment_dismissed` / `payment_failed` | Razorpay flow | `amount`, `stage` |
| `order_placed` | order confirmed | `payment_method`, `total`, `delivery_type`, `coins_used`, `referral_applied` |
| `reordered` | "Order again" tapped on My Orders / an order page | `order_id`, `items`, `unavailable` |
| `whatsapp_chat_opened` | a "Chat on WhatsApp" button tapped | `source` (`product` / `order` / `support` / `account`) |
| `signed_up` / `signup_error` | signup page | `message` |
| `logged_in` / `login_error` / `logged_out` | auth | `method`, `message` |

Every event also carries `platform` (`android_app` / `web`) and `native_shell`.
Signed-in users are identified by their user id and `role` only. No name,
email or phone is sent to PostHog.
