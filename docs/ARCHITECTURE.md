# Fastget Architecture

## Overview

Fastget is a Next.js web application for urgent building material delivery in Mumbai.
The order system now uses Neon Postgres as the source of truth. Google Apps Script
and Google Sheets are deprecated for order capture because deployment/access failures
blocked production checkout.

The product goal is simple: a customer can place an order, Fastget can see it
immediately, and the customer can track status through a tokenized link.

---

## Current Direction

### Decision

Use Neon Postgres connected through Vercel for all order writes, reads, and status
updates.

### Why

- Apps Script deployment access caused `401` failures and UI crashes.
- Google Sheets is weak as a production order database.
- The app already runs on Vercel and has Neon env vars pulled locally.
- The existing API routes can keep their public contract while swapping the storage
  implementation underneath.

### Vercel Notes

Vercel docs recommend using `vercel env run -- next dev` to run local development
with project environment variables injected. They also support `vercel pull` to pull
environment variables for a selected environment.

Use these commands when verifying Neon locally:

```bash
vercel pull --environment=development
vercel env run -- next dev
vercel env run -e production -- npm run build
```

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT                                │
│                                                             │
│  Landing ──► Catalog ──► Cart ──► Checkout                  │
│                                      │                      │
│                                      ▼                      │
│                             /order/[statusToken]            │
│                         token-based tracking page           │
│                                                             │
│                             /agent/[updateToken]            │
│                         PIN-protected status update         │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     NEXT.JS RUNTIME                          │
│                                                             │
│  ┌──────────────────────┐      ┌─────────────────────────┐  │
│  │ App Router UI        │      │ API Routes              │  │
│  │ - cart state         │      │ - POST /api/orders      │  │
│  │ - checkout form      │      │ - GET /api/orders/:tok  │  │
│  │ - order status       │      │ - POST /api/orders/update│  │
│  └──────────────────────┘      └───────────┬─────────────┘  │
└────────────────────────────────────────────┼────────────────┘
                                             │ SQL via env-specific URL
                                             ▼
┌─────────────────────────────────────────────────────────────┐
│                       NEON POSTGRES                          │
│                                                             │
│  Production env                                             │
│    fastget_DATABASE_URL -> neondb / production data          │
│                                                             │
│  Local + test env                                           │
│    fastget_DATABASE_URL -> fastget_test / disposable data    │
│                                                             │
│  orders                                                     │
│  - immutable order details                                  │
│  - JSONB item snapshot                                      │
│  - status token for customer reads                          │
│  - update token for agent writes                            │
└─────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 App Router |
| Language | TypeScript |
| Styling | Tailwind CSS |
| State | React Context + localStorage for cart |
| Backend | Next.js API routes |
| Database | Neon Postgres |
| DB Client | `@neondatabase/serverless` |
| Hosting | Vercel |

---

## Migration Scope

### In Scope

1. Replace `src/lib/sheets.ts` with a Neon-backed order repository.
2. Keep API route URLs and response shapes stable.
3. Add SQL schema for `orders`.
4. Add a basic `/admin/orders` view or SQL query runbook for ops visibility.
5. Remove Apps Script/Sheets env vars from runtime after cutover.
6. Add tests for order create/read/update and error paths.

### NOT in Scope

- Full inventory database. Products can stay in static `src/data/products.ts`.
- Customer accounts and login.
- Payment integration.
- SMS/WhatsApp notifications.
- Historical Sheets import. There are no reliable production orders to preserve yet.
- Realtime driver tracking.

---

## Existing Code To Reuse

| Existing code | Keep / Replace | Notes |
|---------------|----------------|-------|
| `src/app/api/orders/route.ts` | Keep | Replace storage call only. Public contract stays stable. |
| `src/app/api/orders/[token]/route.ts` | Keep | Read from Neon by `status_token`. |
| `src/app/api/orders/update/route.ts` | Keep | Update Neon by `update_token`. |
| `src/app/checkout/page.tsx` | Keep | Already handles failed order creation without clearing cart. |
| `src/app/order/[token]/page.tsx` | Keep | Same token lookup response shape. |
| `src/app/agent/[token]/page.tsx` | Keep, tighten later | Needs stronger transition/PIN validation after DB cutover. |
| `src/lib/sheets.ts` | Replace | It should become `src/lib/orders-db.ts` or equivalent. |
| `google-apps-script/` | Remove after cutover | No longer part of production architecture. |

---

## Data Flow

### Order Creation

```
Customer clicks Place Order
        │
        ▼
POST /api/orders
        │
        ├── validate customer fields
        ├── validate cart has items
        ├── generate id, status_token, update_token
        ├── map cart items into immutable JSONB snapshot
        │
        ▼
INSERT INTO orders
        │
        ├── success: return { orderId, statusToken, status }
        └── failure: return 502, keep cart intact
        │
        ▼
Checkout redirects only after DB insert succeeds
```

### Customer Tracking

```
/order/[statusToken]
        │
        ▼
GET /api/orders/[statusToken]
        │
        ▼
SELECT * FROM orders WHERE status_token = $1
        │
        ├── found: render order status
        └── missing: render Order Not Found
```

### Agent Status Update

```
/agent/[updateToken]
        │
        ▼
POST /api/orders/update
        │
        ├── validate update token
        ├── validate PIN
        ├── validate requested status
        ├── validate legal status transition
        │
        ▼
UPDATE orders
   SET status = $newStatus, eta = $eta
 WHERE update_token = $token
   AND status = $currentStatus
        │
        ├── updated row: success
        └── no row: invalid token or stale transition
```

The conditional `WHERE status = $currentStatus` makes the update safe when two agents
try to update the same order at the same time.

---

## Database Schema

### `orders`

```sql
create table if not exists orders (
  id text primary key,
  created_at timestamptz not null default now(),
  customer_name text not null,
  customer_phone text not null,
  site_address text not null,
  landmark text,
  delivery_type text not null check (delivery_type in ('urgent', 'scheduled')),
  scheduled_time timestamptz,
  items jsonb not null,
  subtotal integer not null check (subtotal >= 0),
  convenience_fee integer not null check (convenience_fee >= 0),
  total integer not null check (total >= 0),
  payment_method text not null check (payment_method = 'cod'),
  status text not null check (
    status in (
      'received',
      'eta_assigned',
      'out_for_delivery',
      'delivered',
      'cancelled'
    )
  ),
  eta text,
  status_token text not null unique,
  update_token text not null unique
);

create index if not exists orders_created_at_idx on orders (created_at desc);
create index if not exists orders_status_idx on orders (status);
```

### Item Snapshot Shape

`orders.items` is JSONB because item prices and names must be preserved at order time.
The product catalog can change later without rewriting old orders.

```json
[
  {
    "sku": "ply-8x4-12mm",
    "name": "Plywood Board 8x4 ft - 12mm",
    "quantity": 1,
    "price": 850
  }
]
```

---

## Order Status State Machine

```
received
   ├── eta_assigned
   │      ├── out_for_delivery
   │      │      ├── delivered
   │      │      └── cancelled
   │      └── cancelled
   └── cancelled
```

Valid transitions:

- `received` -> `eta_assigned`
- `received` -> `cancelled`
- `eta_assigned` -> `out_for_delivery`
- `eta_assigned` -> `cancelled`
- `out_for_delivery` -> `delivered`
- `out_for_delivery` -> `cancelled`

`delivered` and `cancelled` are terminal states.

---

## Security Model

### Public Surface

- Customers only get `status_token`.
- Agents only get `update_token`.
- API responses to customers must never include `update_token`.
- Database credentials stay server-side only.

### Admin / Agent Access

MVP agent updates use a shared `AGENT_PIN`. That is acceptable only for a small pilot.
Move to real auth before adding multiple delivery agents or payment collection.

### Validation Layers

1. Client form validation for immediate user feedback.
2. API route validation before DB writes.
3. Database constraints for impossible states.
4. Status transition validation before updates.
5. Conditional SQL update for stale/concurrent status changes.

---

## Environment Variables

### Required Runtime Variables

The Neon Vercel integration has pulled project-prefixed env vars locally. Use the
pooled connection URL for API routes unless a future migration tool needs the
unpooled URL.

```bash
# Required
fastget_DATABASE_URL=<pooled-neon-postgres-url>

# Current code alias
DATABASE_URL=<same pooled URL>

# Optional fallback names if we decide to normalize later
POSTGRES_URL=<same pooled URL>

# Existing app config
NEXT_PUBLIC_APP_URL=https://fastget.vercel.app
AGENT_PIN=<shared-agent-pin-for-mvp-status-updates>
```

### Environment Split

Local development must not write into production order data.

```
Vercel Production
  fastget_DATABASE_URL -> Neon production database: neondb

Local development
  .env.local -> Neon test database: fastget_test
  .env.development.local -> Neon test database: fastget_test
  .env.test.local -> Neon test database: fastget_test
```

The current DB client reads `DATABASE_URL`, so local env files also include
`DATABASE_URL=<fastget_test pooled URL>` as an alias to the project-prefixed Vercel
variable.

The original Vercel-pulled local env files are backed up locally as:

```bash
.env.local.before-neon-test-db
.env.development.local.before-neon-test-db
```

These files are ignored by git and must not be committed.

### Remove After Cutover

```bash
GOOGLE_SCRIPT_URL
APPS_SCRIPT_SECRET
AGENT_PIN_SALT
```

### Local Development

```bash
npm run dev
```

`npm run dev` now uses `.env.local`, which points at the Neon `fastget_test`
database on this machine.

If you pull Vercel env vars again, re-check that local URLs still point at
`fastget_test` before testing checkout.

### Production Verification

```bash
vercel env run -e production -- npm run build
```

---

## Ops: Viewing Orders

Immediate ops path:

```sql
select
  created_at,
  id,
  customer_name,
  customer_phone,
  site_address,
  total,
  status
from orders
order by created_at desc
limit 100;
```

Recommended MVP admin page:

```
/admin/orders
  ├── protected by ADMIN_PIN
  ├── list newest orders first
  ├── filter by status
  └── link to /order/[statusToken]
```

`/admin/orders` is not required for the first DB cutover, but it should be the next
small ops improvement after checkout works.

---

## Failure Modes

| Failure | User impact | Handling required |
|---------|-------------|-------------------|
| Neon env var missing | Checkout fails | `/api/orders` returns clear 502 and keeps cart. |
| DB insert timeout | Checkout cannot complete | Show retryable error, log server error. |
| Duplicate token collision | Insert fails | Regenerate token or return retryable error. |
| Invalid item JSON | Order detail page breaks | Validate item snapshot before insert and when reading. |
| Token not found | User sees order not found | Current UI already handles this. |
| Two status updates race | Wrong final status | Conditional update by current status. |
| Agent enters wrong PIN | Unauthorized update attempt | Return generic failure, do not reveal token validity. |

Critical rule: never clear cart until the DB insert succeeds.

---

## Test Plan

No test framework is currently configured beyond TypeScript/build checks. Add tests as
part of the Neon cutover rather than deferring them.

```
CODE PATHS                                      USER FLOWS
[+] POST /api/orders                            [+] Checkout
  ├── [GAP] valid order inserts into Neon          ├── [GAP] [E2E] cart -> checkout -> status page
  ├── [GAP] empty cart returns 400                 ├── [GAP] DB failure keeps cart and shows error
  ├── [GAP] missing DB env returns 502             └── [GAP] double-submit creates one order or two explicit orders
  └── [GAP] duplicate token/DB error handled

[+] GET /api/orders/[token]                    [+] Tracking
  ├── [GAP] existing token returns safe order      ├── [GAP] valid token renders status
  └── [GAP] missing token returns 404              └── [GAP] missing token renders Order Not Found

[+] POST /api/orders/update                    [+] Agent update
  ├── [GAP] valid transition updates row           ├── [GAP] wrong PIN shows clear failure
  ├── [GAP] invalid transition rejected            └── [GAP] delivered/cancelled cannot change
  └── [GAP] wrong PIN rejected
```

Minimum required before ship:

1. Unit/integration tests for DB mapper functions.
2. API route tests for create/read/update.
3. One browser QA pass for checkout success and DB failure.

---

## Implementation Plan

1. Create SQL migration file for `orders`.
2. Add `src/lib/orders-db.ts`.
3. Replace imports in the three order API routes.
4. Keep response shapes identical to current frontend expectations.
5. Add `AGENT_PIN` validation in the update route.
6. Remove or quarantine `src/lib/sheets.ts`.
7. Remove Apps Script env vars from docs and Vercel after cutover.
8. Add tests and run `npm run build`, `npm run typecheck`, and browser QA.

Sequential implementation, no parallelization opportunity. The route changes all touch
the same order persistence module and should land together.

---

## Development Guidelines

### Adding New Categories

1. Update `src/data/products.ts`.
2. Add/update products in the static catalog.
3. Later, migrate products into Postgres only if ops needs live inventory changes.

### Modifying Order Flow

1. Update API route validation.
2. Update `src/lib/orders-db.ts`.
3. Update SQL schema or migration if the stored shape changes.
4. Add or update tests for every new branch.
5. Run `/qa` to verify the real user flow.

### Deploying Changes

```bash
npm run build
npm run typecheck
vercel --prod
```

---

## Future Migration Path

### Phase 1: Current Cutover

- Neon Postgres order storage
- Manual ops via Neon SQL Editor
- Tokenized customer tracking
- Shared-PIN agent updates

### Phase 2: Ops Dashboard

- `/admin/orders`
- status filters
- order detail view
- export CSV

### Phase 3: Production Ops

- real admin auth
- audit log for status changes
- customer notifications
- payment collection
- inventory management

---

## Monitoring

- **Database-level:** Neon query metrics and connection health.
- **App-level:** Vercel logs for `/api/orders`, `/api/orders/[token]`, and `/api/orders/update`.
- **Business-level:** orders per day, failed checkout count, delivery success rate.
