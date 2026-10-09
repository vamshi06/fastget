# Phone login (WhatsApp OTP) — setup guide

Customers log in or sign up with their **mobile number** and a 6-digit code sent
to them **on WhatsApp**. Email + password login stays available alongside it.

**Status: built but switched OFF.** Until you finish this guide, nothing about
login changes — the phone screens are hidden and the phone APIs answer 404.

> **Cost note — read first.** Codes are *sent by FastGet* to the customer, which
> Meta bills as an "authentication" message: roughly **₹0.115–0.145 per code**
> (check Meta's current rate card), so you must add a payment method in step A5.
> At ~1,000 logins/month that is ~₹115–145/month. Customers stay logged in for
> 30 days, so codes are only sent at signup / new device / after logout.
> *A ₹0 alternative exists* (the customer sends a pre-filled WhatsApp message to
> you instead — Meta never charges for messages customers send). Ask for it to
> be switched over if the per-code cost is a problem.

---

## Overview

| | What | Who | Time |
|---|---|---|---|
| A | Meta / WhatsApp setup (outside the code) | You | ~1 day + template approval |
| B | Database + config + deploy | You (or a dev) | ~30 min |
| C | Test, then go live | You | ~30 min |

You need: the **new SIM** (FastGet's login number), a laptop, and admin access
to Railway, Neon and the FastGet Facebook/Meta business.

---

## Checking your setup at any point

Run this from the project folder whenever you like — before, during or after
setup. It only reads things; it changes nothing:

```bash
npm run check-phone-login
```

It checks, in order, and tells you which step below fixes anything missing:
1. **Settings** — the switch and WhatsApp variables in `.env.local`
2. **Database** — migration 025 moved and applied, no number shared by two accounts
3. **WhatsApp number + token** — asks Meta whether the token works, which
   number it sends from, and whether the number and "FastGet" name are approved
4. **Template** — exists, is *Authentication*, is *Approved* (needs the optional
   `WHATSAPP_BUSINESS_ACCOUNT_ID` variable)

When everything is green, send yourself one real code to be sure (costs one
message):

```bash
npm run check-phone-login -- --send 98XXXXXXXX
```

✅ = done · ⚠️ = not finished yet (fine mid-setup) · ❌ = needs fixing.

**It checks the settings on *your laptop*** (`.env.local`) by default. To check
the values **Railway** actually uses, run it with Railway's variables via the
[Railway CLI](https://docs.railway.com/guides/cli) (one-time: install it, then
`railway login` and `railway link` in this folder, choosing the FastGet project):

```bash
railway run npm run check-phone-login:railway
```

### Trying it before the new SIM arrives (optional)
Meta gives every WhatsApp app a **free test number** (step A3) that can message
up to 5 phone numbers you register under *API Setup → To*. Put the test
number's *Phone number ID* and the *temporary token* from API Setup into
`.env.local`, then run the checker — sections 1 and 3 should go green. (Whether
the test account lets you create your own Authentication template varies; if
not, the real template check waits for your number.) Swap in the real values
once the SIM is set up.

---

## Part A — WhatsApp / Meta setup (outside the code)

### A1. Prepare the new number
- Put the new SIM in any phone. It must be able to **receive an SMS or call**
  (for one-time verification).
- **Do not register this number in the WhatsApp or WhatsApp Business app.** A
  number can be on the app *or* the Cloud API, not both. (If you already did,
  open WhatsApp on it → Settings → Account → **Delete my account**, wait ~3 min.)
- Keep the SIM recharged so the number stays active — if it's deactivated and
  recycled, someone else could get it.
- Your **current FastGet chat number is not touched** by any of this.

### A2. Meta Business portfolio
1. Go to <https://business.facebook.com> and log in with the Facebook account
   that should own FastGet's business assets.
2. Create a business portfolio (or use the existing Elemantra/FastGet one).
   Use the real legal business name, website `https://fastget.in`, business email.

### A3. Developer app with WhatsApp
1. Go to <https://developers.facebook.com> → **My Apps** → **Create app**.
2. Use case: **Other** → type **Business** → name it e.g. `FastGet Login` →
   connect it to the business portfolio from A2.
3. On the app dashboard, find **WhatsApp** → **Set up**. Accept the terms.
   This creates a *WhatsApp Business Account* plus a free **test number**.

### A4. Add the new number
1. In the app: **WhatsApp → API Setup → Add phone number** (or WhatsApp Manager
   → Phone numbers → Add).
2. **Display name:** `FastGet` (must match your brand / website — Meta reviews it).
   Category: e.g. *Shopping and retail*.
3. Enter the new number, choose **SMS** or **voice call**, enter the code.
4. Wait for the display name to be approved (shown in WhatsApp Manager).

### A5. Add a payment method (required to send codes)
WhatsApp Manager (<https://business.facebook.com/wa/manage>) → **Settings /
Payment settings** → add a card. Set a monthly **spend limit / alerts** if offered.

### A6. Create the OTP message template
WhatsApp Manager → **Message templates** → **Create template**:

| Field | Value |
|---|---|
| Category | **Authentication** |
| Name | `fastget_login_code` (exactly — or change `WHATSAPP_OTP_TEMPLATE`) |
| Language | **English** (`en`) |
| Code delivery | **Copy code** |
| Security recommendation | On ("For your security, do not share this code") |
| Expiration warning | On, **5 minutes** (the code expires in 5 min in our system) |

Submit. Authentication templates are usually approved within minutes to a few
hours. *Optional:* add a **Hindi** version of the same template later (see C4).

### A7. Get a permanent access token
The token on the API Setup page expires in 24 h — don't use it in production.
1. <https://business.facebook.com> → **Settings** → **Users → System users** →
   **Add** → name `fastget-server`, role **Admin**.
2. Select it → **Assign assets**: the app (`FastGet Login`, full control) and the
   WhatsApp account (full control).
3. **Generate new token** → choose the app → expiry **Never** → permissions:
   `whatsapp_business_messaging` and `whatsapp_business_management`.
4. **Copy the token now** (it is shown once). Treat it like a password.

### A8. Note the Phone number ID
App → **WhatsApp → API Setup** → choose your new number in the *From* dropdown
→ copy **Phone number ID** (a long number — *not* the phone number itself).

### A9. Quick test from your laptop (optional but recommended)
Replace the three values and send a code to your own WhatsApp:
```bash
curl -X POST "https://graph.facebook.com/v21.0/PHONE_NUMBER_ID/messages" \
  -H "Authorization: Bearer ACCESS_TOKEN" -H "Content-Type: application/json" \
  -d '{"messaging_product":"whatsapp","to":"91YOURNUMBER","type":"template",
       "template":{"name":"fastget_login_code","language":{"code":"en"},
       "components":[{"type":"body","parameters":[{"type":"text","text":"123456"}]},
                     {"type":"button","sub_type":"url","index":"0","parameters":[{"type":"text","text":"123456"}]}]}}'
```
You should receive "123456 is your verification code" with a *Copy code* button.

### A10. Business verification (recommended, not blocking)
Business settings → **Security Center → Start verification** (GST/PAN etc.).
Without it you can message **250 different customers per 24 h** — plenty to
start. Verification lifts this to 1,000+ automatically.

---

## Part B — Database, config, deploy

### B1. Fix numbers shared by several accounts
Phone login requires one account per number. `npm run check-phone-login`
tells you if any number is shared (at the last check there were none — an
earlier one ending 9131 had been fixed). New signups can create duplicates
until the migration runs, so check again right before B2. To find them in the
Neon SQL editor:
```sql
SELECT RIGHT(REGEXP_REPLACE(phone, '[^0-9]', '', 'g'), 10) AS number,
       COUNT(*) AS accounts, array_agg(email || ' (' || role || ')') AS who
FROM users GROUP BY 1 HAVING COUNT(*) > 1;
```
For each, keep one account on that number and change the others' phone (My
Profile, or `UPDATE users SET phone = '...' WHERE email = '...';`) or delete
test accounts. Re-run the query until it returns **no rows**.

### B2. Run the database migration
The migration is parked so nothing runs it by accident:
1. **Move** `db/migrations-pending/025_phone_login.sql` → `db/migrations/025_phone_login.sql`.
2. Run `npm run sync-schema` (this also applies any other pending migrations,
   e.g. 024 home banners).

What it does: makes phone numbers unique, adds `phone_verified`, and creates the
`phone_otps` table (codes are stored hashed, never in plain text). Email stays
required, as today. It's safe to run more than once.

> Tip: to rehearse first, create a **Neon branch** of the database and point a
> local `.env.local` at it — run B1–B2 there, test, then repeat on production.

### B3. Environment variables
Set these on **Railway** — <https://railway.app> → the FastGet project → the
web **service** → **Variables** tab → *New Variable* (or *Raw Editor* to paste
several) — and in your local `.env.local`:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_PHONE_LOGIN_ENABLED` | `true` |
| `WHATSAPP_PHONE_NUMBER_ID` | from A8 |
| `WHATSAPP_ACCESS_TOKEN` | from A7 (keep secret) |
| `WHATSAPP_OTP_TEMPLATE` | `fastget_login_code` |
| `WHATSAPP_TEMPLATE_LANG` | `en` |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | *(optional)* WhatsApp Business Account ID — only for the checker's template check |

`ADMIN_SESSION_SECRET` must already be set (it is used to hash the codes).

### B4. Deploy
Railway shows your variable edits as *staged changes* — click **Deploy** to
apply them (or push a commit). This must be a **full redeploy, not just a
restart**: `NEXT_PUBLIC_*` values are baked in when the site is *built*, so
`NEXT_PUBLIC_PHONE_LOGIN_ENABLED` only takes effect after a new build.
Railway's build (see `railway.toml`) can read service variables, so setting the
variable and deploying is enough. Check the deploy's build logs finished, then
open `/login` on the live site — you should see "Get code on WhatsApp".

No app (Play Store) release is needed: the login screens live on the website.

---

## Part C — Test, go live, maintain

### C1. Test checklist (on the live site or a preview)
- [ ] **New number** → code arrives on WhatsApp → enter it → "Almost done" →
      name + email → logged in, account created.
- [ ] Signup without an email or with an email already used by another
      account → "Continue" stays disabled / clear error.
- [ ] **Existing customer's number** → code → logged straight into their
      existing account (orders, coins, addresses all there).
- [ ] Wrong code → error; 5 wrong codes → "Too many wrong tries".
- [ ] "Resend code" only after 30 s; a new code makes the old one stop working.
- [ ] **Admin's number** → refused ("Staff accounts log in with email and password").
- [ ] **Email fallback for a phone signup:** sign up by phone →
      log out → "Log in with email instead" → "Forgot password?" → code arrives
      by email → set a password → email login works.
- [ ] "Log in with email instead" → normal email login still works.
- [ ] Account → Delete account → "No password? Confirm with a WhatsApp code" →
      code → account deleted (test with a throwaway account).
- [ ] In the Android app: the same flow works inside the app.

### C2. If something goes wrong — switch it off
Set `NEXT_PUBLIC_PHONE_LOGIN_ENABLED=false` (or remove it) and redeploy. Email
login works exactly as before. The migration can stay — it doesn't affect
email login. Accounts created by phone stay, but customers who never set a
password can't log in while it's off (and "Forgot password" only helps them
while phone login is on) — so treat switching off as a short-term measure.

### Email fallback — who has it
Email + password login stays on the login screen ("Log in with email instead").

| Customer | Phone login | Email login |
|---|---|---|
| Existing customer (signed up with email) | Yes — same account, via their number | Yes, unchanged |
| New, signed up **by phone** (email is required at signup) | Yes | Yes, after setting a password once via **Forgot password** (the emailed code also verifies their email) |
| Staff (admin / agent) | No (refused on purpose) | Yes, as today |

So **every** customer has the email fallback. If WhatsApp is down or a code
can't be sent, the screen says so and points to email login.

### C3. Costs & abuse protection (built in)
- At most **5 codes per number per hour** and **15 per network (IP) per hour**,
  and a 30-second wait between codes — limits how much anyone can make you spend.
- Only valid Indian mobile numbers (10 digits starting 6–9) get codes.
- The login screen never reveals whether a number already has an account.
- Watch spending in WhatsApp Manager → Insights / Billing.

### C4. Optional extras
- **Hindi template:** add a Hindi (`hi`) language to `fastget_login_code` in
  WhatsApp Manager. To use it for Hindi users, the code in
  `src/lib/whatsapp.ts` would need to pick the language from the customer's
  locale (currently fixed by `WHATSAPP_TEMPLATE_LANG`).
- **Auto-fill on Android:** the code field already supports the browser's
  one-time-code autofill; full auto-read would need a native app module.

---

## Where things are in the code

| What | File |
|---|---|
| On/off switch | `src/lib/feature-flags.ts` (`NEXT_PUBLIC_PHONE_LOGIN_ENABLED`) |
| Sending the WhatsApp message | `src/lib/whatsapp.ts` |
| Codes: create, hash, check, limits | `src/lib/phone-otp.ts` |
| Account lookup / creation by phone | `src/lib/users.ts` (`getUsersByPhone`, `createPhoneUser`, `markPhoneVerified`) |
| APIs (404 while off) | `src/app/api/auth/phone/{send-otp,verify,complete,delete}/route.ts` |
| Login screen (number → code → name) | `src/components/PhoneLogin.tsx`, used by `src/app/login/page.tsx` |
| "Sign up with mobile" shortcut | `src/app/signup/page.tsx` |
| Delete account without a password | `src/components/DeleteAccountButton.tsx` |
| Database change (parked) | `db/migrations-pending/025_phone_login.sql` |
| Text (English / Hindi) | `messages/{en,hi}/auth.json` → `phone` |

**Local testing before the number exists:** with the flag on and the WhatsApp
variables left empty, a local `npm run dev` prints each code to the server
console instead of sending it (never in production) — but it still needs B1–B2
done on the database you point at (use a Neon branch, not production).
