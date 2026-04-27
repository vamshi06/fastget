# Fastget Architecture

## Overview

Fastget is a Next.js web application for urgent building material delivery in Mumbai. It uses a hybrid architecture: modern React frontend with Google Sheets as the MVP backend.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   Landing    │  │     Cart     │  │     Checkout     │  │
│  │   Page       │  │    Page      │  │      Page        │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │               Order Status Page                      │  │
│  │         (token-based, no auth required)              │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP
┌───────────────────────────▼─────────────────────────────────┐
│                     NEXT.JS APP                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  API Routes  │  │  Server      │  │  Client State    │  │
│  │  (Orders)    │  │  Components  │  │  (Cart)          │  │
│  └──────┬───────┘  └──────────────┘  └──────────────────┘  │
└─────────┼────────────────────────────────────────────────────┘
          │
          │ Apps Script HTTP POST
          ▼
┌─────────────────────────────────────────────────────────────┐
│                   GOOGLE SHEETS                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Orders Sheet                                        │  │
│  │  - id | timestamp | items | total | customer | ...   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Products Sheet                                      │  │
│  │  - sku | name | price | category | stock_status      │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| State | React Context (cart) |
| Backend | Google Apps Script + Sheets |
| Hosting | Vercel (recommended) |

---

## Data Flow

### Order Creation Flow

```
Customer Checkout
       │
       ▼
┌──────────────────┐
│ POST /api/orders │
└────────┬─────────┘
         │
         ▼
┌────────────────────┐
│ Validate Payload   │
│ - Items present    │
│ - Phone valid      │
│ - Address complete │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│ Apps Script POST   │
│ - Append to Sheet  │
│ - Generate tokens  │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│ Return Response    │
│ - statusToken      │
│ - eta (approx)     │
└────────┬───────────┘
         │
         ▼
Redirect to /order/[statusToken]
```

### Status Update Flow (Agent)

```
Agent Opens Link
       │
       ▼
┌──────────────────────────┐
│ GET /agent/order/[token] │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│ Enter PIN                │
│ POST status update       │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│ Validate PIN             │
│ Validate transition      │
│ Update Sheet row         │
└──────────┬───────────────┘
           │
           ▼
    Success / Error
```

---

## Order Status State Machine

```
                    ┌─────────────┐
         ┌─────────►│   received  │◄────────┐
         │          └──────┬──────┘         │
         │                 │                │
         │                 ▼                │
    ┌────┴────┐      ┌─────────────┐       │
    │cancelled│      │eta_assigned │       │
    └─────────┘      └──────┬──────┘       │
                            │              │
                            ▼              │
                      ┌─────────────┐      │
                      │out_for_delivery    │
                      └──────┬──────┘      │
                             │             │
                             ▼             │
                       ┌─────────────┐     │
                       │  delivered  │─────┘
                       └─────────────┘
```

**Valid Transitions:**
- `received` → `eta_assigned`
- `received` → `cancelled`
- `eta_assigned` → `out_for_delivery`
- `eta_assigned` → `cancelled`
- `out_for_delivery` → `delivered`
- `out_for_delivery` → `cancelled`

---

## Google Sheets Schema

### Orders Sheet

| Column | Type | Description |
|--------|------|-------------|
| id | string | UUID v4 |
| created_at | timestamp | ISO 8601 |
| customer_name | string | |
| customer_phone | string | Validated 10 digits |
| site_address | string | |
| landmark | string | Optional |
| delivery_type | enum | `urgent` or `scheduled` |
| scheduled_time | timestamp | Nullable |
| items | JSON | Array of {sku, qty, price} |
| subtotal | number | Sum of item prices |
| convenience_fee | number | Configurable |
| total | number | subtotal + fee |
| payment_method | enum | `cod` only (MVP) |
| status | enum | See state machine |
| eta | string | Human readable |
| status_token | string | Customer-facing token |
| update_token | string | Agent-facing token |
| agent_pin | string | Hashed 4-digit PIN |

### Products Sheet

| Column | Type | Description |
|--------|------|-------------|
| sku | string | Unique identifier |
| name | string | Display name |
| category | string | carpentry/plumbing/etc |
| price | number | INR |
| unit | string | pcs/kg/meter/etc |
| stock_status | enum | `in_stock`/`low`/`out` |
| image_url | string | Optional |

---

## Security Model

### Tokens

- **Status Token:** UUID-based, customer-facing, read-only access to single order
- **Update Token:** Separate UUID, agent-facing, requires PIN for write
- **PIN:** 4-digit numeric, stored hashed (SHA-256), rate-limited

### Validation Layers

1. **Client-side:** Immediate feedback on phone format, empty fields
2. **API Route:** Schema validation (Zod recommended)
3. **Apps Script:** Final validation before sheet write
4. **State Machine:** Transition validation prevents illegal status changes

---

## Future Migration Path

### Phase 1: MVP (Current)
- Google Sheets backend
- Manual ops processes
- Basic status tracking

### Phase 2: Automation
- Automated ETA assignment
- Inventory sync from suppliers
- Basic admin dashboard

### Phase 3: Scale
- PostgreSQL database
- Real-time order tracking
- Driver mobile app
- Inventory management
- Analytics dashboard

---

## Development Guidelines

### Adding New Categories

1. Update `src/data/categories.ts`
2. Add products to Google Sheet
3. Update landing page category grid

### Modifying Order Flow

1. Update API route validation
2. Update Apps Script handler
3. Add test case to test-plan.md
4. Run `/qa` to verify

### Deploying Changes

```bash
# Local development
npm run dev

# Production build
npm run build

# Deploy (Vercel)
vercel --prod
```

---

## Environment Variables

```bash
# Required
GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/...
NEXT_PUBLIC_APP_URL=https://fastget.vercel.app

# Optional
CONVENIENCE_FEE_PERCENTAGE=10
MAX_ORDER_QUANTITY=50
AGENT_PIN_SALT=<random-string>
```

---

## Monitoring

- **Sheet-level:** Google Apps Script execution logs
- **App-level:** Vercel Analytics
- **Business-level:** Orders per day, conversion rate, delivery success rate
