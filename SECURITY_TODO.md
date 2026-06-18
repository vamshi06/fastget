# Security Remediation TODO

Working checklist from the security audit (web: Next.js 14.2.35, mobile: Expo WebView).
Work top-to-bottom — phases are ordered by risk. Check items off as you go.

**Status legend:** `[ ]` not started · `[~]` in progress · `[x]` done · `[!]` blocked

Counts at audit time: **6 Critical · 6 High · 7 Medium · 4 Low**

---

## Phase 0 — Containment (do first, today)

- [x] **C1 · Remove env files from the working tree** — untracked both `.before-neon-test-db` files (local copies kept on disk). Commit `b541948`.
- [x] **C1 · Fix [.gitignore](.gitignore)** — now `.env*` with `!.env.example` allowlist. Commit `b541948`.
- [x] **C1 · Scrub the hardcoded Apps Script URL** in [test_apps_script.sh](test_apps_script.sh) — now reads `$GOOGLE_SCRIPT_URL`. Commit `b541948`.
- [x] **C1 · Rotate every committed secret** — user confirmed rotation done (Neon DB password, Apps Script secret/salt, Vercel token check, Razorpay keys). Leaked git-history values are now dead.
  - [ ] *Follow-up:* update new values in [.env.local](.env.local) + Vercel env, then redeploy & verify `npm run dev` connects (do this yourself; don't paste new secrets here)
- [ ] **C1 · Scrub the secrets from git history.** ⏳ *Needs your go-ahead — rewrites shared history on `origin/intern` and requires a coordinated force-push (every collaborator must re-clone/reset).* `git filter-repo` is the tool; do this only after rotation so leaked values are already dead.
  ```bash
  git filter-repo --path .env.local.before-neon-test-db \
                  --path .env.development.local.before-neon-test-db --invert-paths
  # then: git push --force-with-lease (after coordinating with the team)
  ```

---

## Phase 1 — Critical auth & data exposure

- [x] **C2 · Consolidate middleware to a single file** — deleted root `middleware.ts`; [src/middleware.ts](src/middleware.ts) is now the only gate. Matcher: `/admin/:path*`, `/agent-dashboard`, `/api/orders/pending`, `/api/init-db`. Commit `0b439a6`.
  - [x] **Runtime-verified** the gate fires: protected routes → 401/redirect; customer routes + `/agent/[token]` reachable; middleware now registers in the build manifest (was `sortedMiddleware: []`).
- [x] **C2 · Server-side guards** — added [src/lib/auth.ts](src/lib/auth.ts) (`getSession` / `requireRole` / `requireAdminPage`) and applied to:
  - [x] [admin/api/products/route.ts](src/app/admin/api/products/route.ts) (POST)
  - [x] [admin/api/products/[productCode]/route.ts](src/app/admin/api/products/[productCode]/route.ts) (GET/PATCH/DELETE)
  - [x] [admin/api/orders/export/route.ts](src/app/admin/api/orders/export/route.ts) — **also closes H6** (PII CSV dump)
  - [x] [api/init-db/route.ts](src/app/api/init-db/route.ts) (GET)
  - [x] Admin server components: dashboard, orders list, order detail
- [x] **C2 · Remove the orphaned `admin_token` scheme** — removed all `admin_token`/`ADMIN_TOKEN` references and deleted the superseded `/admin-login` page.

> **⚠️ Behaviour change to confirm:** `/agent-dashboard` + `/api/orders/pending` now require an **admin** session (they expose all-order PII). Per-order `/agent/[token]` links still work without login (capability token). If delivery agents need self-serve dashboard access, we'll add `agent`-role accounts later and widen the guard — tell me if that's needed.
- [x] **C3 · Kill the IDOR pattern — derive `userId` from the verified session cookie, never from the request.** Added `requireSession()` to [auth.ts](src/lib/auth.ts). Commit `aae4a3c`.
  - [x] [my-orders/route.ts](src/app/api/orders/my-orders/route.ts) — session-derived; `?userId=` ignored
  - [x] [addresses/route.ts](src/app/api/addresses/route.ts) — GET + POST
  - [x] [addresses/[id]/route.ts](src/app/api/addresses/[id]/route.ts) — PUT/DELETE scoped to owner (DB now matches `id AND user_id`)
  - [x] [addresses/[id]/set-primary/route.ts](src/app/api/addresses/[id]/set-primary/route.ts)
  - [x] [wishlist/route.ts](src/app/api/wishlist/route.ts) + [wishlist/[productId]/route.ts](src/app/api/wishlist/[productId]/route.ts)
  - [x] Reads are cookie-driven — the `fastget_session` cookie (set at login) is now the source of identity; client code unchanged (same-origin fetch sends it automatically).
  - Runtime-verified: 401 without a valid session (spoofed `userId` or forged cookie); valid session returns only the caller's own data.

> **Note for later (related IDOR):** ✅ **Done** (commit `d534fe7`). Order *creation* now derives `userId` from the verified session cookie and ignores the body value; guest checkout still works (NULL user). Shipped alongside the H1 server-side pricing work.
- [x] **C4 · Stop leaking the agent `update_token`** (auth-gate was already done in C2). Decision: order processing is staff-only, so the `update_token` capability is retired in favour of **admin session + order id**. Commit `da7a6f6`.
  - [x] [pending route](src/app/api/orders/pending/route.ts) no longer returns `update_token` or `status_token`
  - [x] Agent flow keyed on order id: dashboard → `/agent/<id>` → admin-gated [/api/orders/by-id/[id]](src/app/api/orders/by-id/[id]/route.ts); [/api/orders/update](src/app/api/orders/update/route.ts) now requires an admin session + `orderId`
  - [x] `/agent/:path*` is now admin-gated in [middleware](src/middleware.ts)
  - [x] Deleted the two **public** order-by-`update_token` endpoints (`agent-token`, `by-update-token`) and the unused `getOrderByUpdateToken()`
  - [x] Removed the `update_token` display from the admin order detail page
  - Runtime-verified: deleted endpoints 404; agent surface 401/redirect without an admin session; pending + by-id return order data with **zero tokens**.

> **Note:** the agent flow still requires the 4-digit PIN on top of the admin session (defense-in-depth). The weak shared PIN itself is **C6** — now lower urgency since the session is the real gate.
- [x] **C5 · Fix payment-confirmation bypass** in [verify-payment](src/app/api/payment/verify-payment/route.ts). Commit `f1f99e0`.
  - [x] Verify `razorpay_order_id === stored razorpay_order_id` for the `orderId` (mirrors the callback route) — this is the actual fix.
  - [x] ~~Verify `payment.amount === order.total * 100`~~ **Intentionally skipped**: binding the razorpay order already locks the amount (Razorpay fixes a payment's amount to its order), and a DB-`total`×100 check would risk *false rejections* of legit payments because `CONVENIENCE_FEE_PERCENTAGE` can make fractional-rupee totals that the `INTEGER` column rounds. (If we later want an explicit amount check, store the Razorpay order's amount at create time and compare against that — tracked with H1.)
  - Runtime-verified: forged signature → "Signature mismatch"; valid signature for a non-matching `razorpay_order_id` → "Payment order reference mismatch" (was: order confirmed).
- [x] **C6 · Replace trivial admin/agent credentials.**
  - [x] `ADMIN_TOKEN` static scheme (incl. URL/header acceptance) — removed entirely in **C2**.
  - [x] Shared 4-digit `AGENT_PIN` — **retired** (commit `506fb69`). Since the update endpoint requires an admin session (C4), the PIN was redundant. Removed from db/route/UI and replaced with an "Are you sure?" confirmation modal. Runtime-verified update works session-only, no PIN.
  - ℹ️ `.env.local` still contains the now-unused `ADMIN_TOKEN` / `AGENT_PIN` lines — harmless (nothing reads them); delete them whenever convenient.

---

## Phase 2 — High

- [x] **H1 · Compute prices/totals server-side** from the trusted catalog; reject mismatched client totals. Commit `c1c30a8`.
  - [x] `getTrustedUnitPrices()` (lib/products) — authoritative unit price per `product_code` from `products_catalog_view`, mirrors storefront `round(paise/100)`.
  - [x] `priceOrderFromCatalog()` (lib/order-pricing) — recomputes items/subtotal/fee/total; rejects unknown products (400) and tampered/stale client totals (409).
  - [x] [orders/route.ts](src/app/api/orders/route.ts) + [create-order/route.ts](src/app/api/payment/create-order/route.ts) use server values; Razorpay amount = server total. **Also closes the C3 order-creation IDOR note** (userId now session-derived, commit `d534fe7`).
  - Runtime-verified: lied price=1/total=1 on a ₹55 line → 409; unknown code → 400; honest totals reconcile unchanged.
- [x] **H2 · Add `exp` to session tokens and enforce it.** Commit `0ceab27`. `createSessionToken` sets `exp = iat + sessionMaxAge(role)`; `verifySessionToken` rejects missing/expired `exp` (legacy no-exp tokens treated as expired). Runtime-verified: valid→200, no-exp→401, past→401.
- [x] **H3 · Add rate limiting / brute-force protection** (per IP + per account). Commit `7ea7500`. New `lib/rate-limit.ts` — Neon-backed fixed-window limiter (works on serverless; fails open), 429 + `Retry-After`.
  - [x] [login](src/app/api/auth/login/route.ts) — ip 20/10m, account 6/15m
  - [x] [signup](src/app/api/auth/signup/route.ts) — ip 6/1h
  - [x] [forgot-password](src/app/api/auth/forgot-password/route.ts) — ip 6/1h, account 4/1h
  - [x] [verify-reset-otp](src/app/api/auth/verify-reset-otp/route.ts) — ip 12/15m, account 6/15m (OTP brute-force infeasible within these limits before the 10-min expiry)
  - [x] [verify-email](src/app/api/auth/verify-email/route.ts) — ip 12/15m, account 8/15m
  - [x] ~~[orders/update](src/app/api/orders/update/route.ts) — agent PIN attempts~~ **Moot**: the agent PIN was retired in C6; the route is admin-session-gated.
  - Runtime-verified: 6 login attempts → 401, 7th → 429 with `Retry-After`.
- [x] **H4 · Lock down `/api/init-db`** — already admin-gated in C2; now also stops returning `error.message`. Commit `a9f8230`. Runtime-verified: no/customer session → 401.
- [~] **H5 · Dependency hygiene** — safe subset done (commit `57ea43a`).
  - [x] Move `vercel` CLI to `devDependencies` — **production-only audit 36 → 3 vulns** (was the source of most high vulns).
  - [x] Next.js already on latest 14.2.x (14.2.35) — no in-range patch; 15.x major jump out of scope.
  - [ ] *Remaining (declined breaking-change pass):* `npm audit fix` for `form-data` (plain, low-risk); `next`/bundled `postcss` need the Next 15 major upgrade.
  - [ ] Add `npm audit --omit=dev` to CI
- [x] **H6 · Auth-gate the CSV export** (full PII for up to 10k orders) — done as part of C2 (`requireRole('admin')` on [export route](src/app/admin/api/orders/export/route.ts)). Commit `0b439a6`.

---

## Phase 3 — Medium

- [x] **M1 · Add security headers** in [next.config.mjs](next.config.mjs) `headers()`. Commit `b8e9065`. X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy: strict-origin-when-cross-origin, Permissions-Policy, HSTS (prod only), and CSP in **Report-Only** mode (allowlist for Razorpay/Cloudinary/fonts). Runtime-verified headers present on `/`. *Follow-up: flip CSP from Report-Only to enforce after reviewing prod violation reports.*
- [x] **M2 · Mobile: re-enable iOS ATS.** Commit `5f8a07c`. Replaced `NSAllowsArbitraryLoads: true` with `NSAllowsLocalNetworking: true` — ATS enforced for all public traffic; only private-LAN HTTP (dev server) is allowed. (Config-level; not runtime-verified — needs an iOS build.)
- [x] **M3 · Mobile: validate URLs before `Linking.openURL`** in [WebViewScreen.tsx](mobile/src/screens/WebViewScreen.tsx). Commit `65eda47`.
  - [x] `onMessage` DOWNLOAD_PDF — only opens own-origin URLs (`startsWith ${APP_URL}/`), blocking file:/javascript:/data:/third-party.
  - [x] `onShouldStartLoadWithRequest` — allowlist of UPI/payment/intent schemes only; all other non-http schemes ignored.
- [x] **M4 · Logging / error hygiene** — Commit `c8b58f2`. logger now masks PII (email→`v***@x`, phone→last4, userId→prefix, name→initial); secrets stay `[REDACTED]`. The "never return exception messages" half was already true across routes (init-db fixed in H4; invoice returns generic).
- [x] **M5 · Replace weak crypto utils** in [utils.ts](src/lib/utils.ts). Commit `2cd3d01`. `generateToken` now uses crypto.getRandomValues with rejection sampling (no `%36` bias, no Math.random fallback). Dead `hashPin`/`generatePin` deleted (PIN retired in C6).
- [x] **M6 · Capability-token leakage.** Commit `9d0f714`. `Referrer-Policy: no-referrer` on `/order/*`, `/api/orders/*`, `/api/invoice/*`; token entropy raised (16→32 base36 chars, ~165 bits). `agent-token` route was already removed in C4. Expiry intentionally skipped (status tokens are permanent tracking links).
- [x] **M7 · CSRF protection** on cookie-authed state changes. Commit `c2e2a2a`. `crossOriginResponse()` wired into `requireRole`/`requireSession` (covers admin CRUD, order status, addresses, wishlist): blocks `Sec-Fetch-Site: cross-site`, falls back to Origin-vs-Host. Runtime-verified: cross-site/evil-Origin → 403, same-origin → passes. On top of the existing SameSite=Lax cookie.

---

## Phase 4 — Low

- [x] **L1 · [.env.example](.env.example)** — removed `AGENT_PIN=1234`; documented the REQUIRED `ADMIN_SESSION_SECRET` with an `openssl rand -hex 32` hint instead (done with C6, commit `506fb69`).
- [x] **L2 · Account deletion** — Commit `65eeb18`. `deleteUser` now runs a single `sql.transaction([...])` (wishlists, addresses, user) and uses the user DELETE's `RETURNING id` as the success signal; the `setTimeout(100)` + unpooled re-read hack is gone. Verified against the DB (non-existent id → 0 rows → false).
- [x] **L3 · `X-Robots-Tag: noindex`** on `/admin/*` — Commit `125c903`. Added in next.config `headers()`. Runtime-verified on `/admin/login`; not present on `/`.
- [x] **L4 · Drop the static-token `timingSafeEqual`** — **Moot/done.** The static-token scheme and its `timingSafeEqual` lived in the root `middleware.ts` that was deleted in C2. The only remaining `timingSafeEqual` is the legitimate Razorpay HMAC check ([razorpay.ts](src/lib/razorpay.ts#L68)), which is in the "verified clean" list and stays.

---

## Verified clean (no action needed)
- SQL injection — all queries use parameterized `@neondatabase/serverless` tagged templates
- XSS — no `dangerouslySetInnerHTML`; React escapes rendered fields
- SSRF — providers use fixed endpoints; no user-controlled outbound fetches
- Path traversal — N/A; invoices resolved by DB token, not filesystem paths
- Razorpay signature verification — HMAC-SHA256 + constant-time + real status fetch (the gap is order-binding, see C5)
- CVE-2025-29927 (Next.js middleware bypass) — patched (running 14.2.35)

---

## Cross-cutting refactors (reduce future risk)
- [ ] One `requireSession()` / `requireRole()` used everywhere (server-derived identity)
- [ ] One rate limiter (e.g. `@upstash/ratelimit` + Vercel KV)
- [ ] One error responder that never leaks internals in prod
- [ ] One headers config at the edge
