# Neon Order CRUD Implementation Plan

## Overview

Migrate from Google Apps Script and Google Sheets to Neon Postgres for all order operations (create, read, update). This replaces the deprecated backend and provides a reliable, observable order system.

**Total Effort:** ~4-6 hours  
**Priority:** P0  
**Blocker:** Apps Script deployment failures on checkout

---

## Phase 1: Database Setup (1-2 hours)

### Objective
Create and verify the `orders` table schema in Neon Postgres.

### Tasks

- [ ] **Complete the `orders` table schema** in `src/lib/db.ts`
  - Verify all required columns exist:
    - `id` (UUID primary key)
    - `created_at` (timestamp with timezone, default CURRENT_TIMESTAMP)
    - `customer_name` (varchar 255, not null)
    - `customer_phone` (varchar 20, not null)
    - `site_address` (text, not null)
    - `landmark` (text, nullable)
    - `delivery_type` (varchar 20, check constraint: 'urgent' or 'scheduled')
    - `scheduled_time` (timestamp with timezone, nullable)
    - `items` (JSONB, not null — stores array of OrderItem)
    - `subtotal` (integer, not null)
    - `convenience_fee` (integer, not null)
    - `total` (integer, not null)
    - `payment_method` (varchar 20, not null, default 'cod')
    - `status` (varchar 50, not null, default 'received', check constraint)
    - `eta` (text, nullable)
    - `status_token` (varchar 255, not null, unique)
    - `update_token` (varchar 255, not null, unique)

- [ ] **Add database indexes**
  - Unique index on `status_token` for fast customer lookups
  - Unique index on `update_token` for fast agent lookups
  - Index on `created_at` for listing and sorting
  - Index on `status` for filtering

- [ ] **Verify environment configuration**
  - Check `DATABASE_URL` or `fastget_DATABASE_URL` in `.env.local`
  - Pull from Vercel: `vercel pull --environment=development`
  - Confirm connection string points to Neon

- [ ] **Test schema locally**
  - Run `initializeDatabase()` to create tables
  - Verify schema in Neon console
  - Check indexes are created

- [ ] **Sync schema to Vercel preview/production**
  - Verify schema exists in production Neon database
  - Test connection from Vercel runtime

---

## Phase 2: Order Database Functions (1-2 hours)

### Objective
Implement core CRUD operations in `src/lib/db.ts`.

### Tasks

- [ ] **`createOrder(order: Order): Promise<boolean>`**
  - Insert order into database
  - Handle UUID generation
  - Return `true` on success, `false` on failure
  - Log errors (duplicate tokens should be extremely rare)

- [ ] **`getOrderByStatusToken(token: string): Promise<Order | null>`**
  - Query by `status_token`
  - Return full Order object or null if not found
  - Use for customer status tracking page

- [ ] **`getOrderByUpdateToken(token: string): Promise<Order | null>`**
  - Query by `update_token`
  - Return full Order object or null if not found
  - Use for agent status update page

- [ ] **`updateOrderStatus(updateToken: string, newStatus: OrderStatus): Promise<boolean>`**
  - Fetch current order by `update_token`
  - Validate state transition against `VALID_STATUS_TRANSITIONS`
  - Update `status` and `eta` columns
  - Return `true` on success, `false` on invalid transition or not found
  - Log rejected transitions for debugging

- [ ] **Error handling**
  - Connection errors: log and return null/false
  - Validation errors: return null/false with descriptive logs
  - Database constraint violations: catch and return false
  - Missing env var: throw error on module load (fail fast)

- [ ] **Type safety**
  - Use TypeScript types from `src/types/index.ts`
  - Ensure return types match API expectations
  - Add JSDoc comments for each function

---

## Phase 3: API Routes (1-2 hours)

### Objective
Update three existing API routes to use Neon instead of Google Apps Script.

### Tasks

#### **POST `/api/orders` (Create Order)**

- [ ] Parse request body (checkout form + cart items)
- [ ] Validate using `validateOrderForm()` from `src/lib/utils.ts`
- [ ] Check cart is not empty
- [ ] Generate `statusToken` and `updateToken` using `generateToken()`
- [ ] Build Order object with `status: 'received'`
- [ ] Call `createOrder(order)`
- [ ] Return response:
  - **201 on success:** `{ success: true, orderId, statusToken, status }`
  - **400 on validation error:** `{ error: "message" }`
  - **502 on DB failure:** `{ error: "We could not place the order right now. Please try again." }`

#### **GET `/api/orders/[token]` (Fetch Order)**

- [ ] Extract `token` from route params
- [ ] Call `getOrderByStatusToken(token)`
- [ ] Return response:
  - **200 on found:** full Order object
  - **404 if not found:** `{ error: "Order not found" }`

#### **POST `/api/orders/update` (Update Status)**

- [ ] Parse request body: `updateToken`, `newStatus`, `agentPin`
- [ ] Validate `agentPin` against env var `AGENT_PIN` (server-side only)
- [ ] Return **401** if PIN invalid
- [ ] Call `updateOrderStatus(updateToken, newStatus)`
- [ ] Return response:
  - **200 on success:** updated Order object
  - **404 if token not found:** `{ error: "Order not found" }`
  - **400 on invalid transition:** `{ error: "Cannot transition from X to Y" }`

### Keep Response Shapes Stable
- ✅ Existing checkout flow expects same token/status response
- ✅ Existing status page expects same Order fields
- ✅ Existing agent page expects same status/eta updates

---

## Phase 4: Testing & Validation (1-2 hours)

### Objective
Verify order CRUD works end-to-end without breaking existing UI.

### Tasks

#### **Unit/Integration Testing**

- [ ] **Create order flow**
  - POST to `/api/orders` with valid checkout data
  - Verify `orderId`, `statusToken`, `updateToken` returned
  - Confirm order exists in Neon with `status: 'received'`

- [ ] **Fetch order flow**
  - GET `/api/orders/:statusToken`
  - Verify full order data returned
  - Test invalid token returns 404

- [ ] **Update status flow**
  - POST `/api/orders/update` with valid `updateToken` and new status
  - Verify status transitions (e.g., received → eta_assigned → out_for_delivery)
  - Test invalid transition is rejected
  - Test missing/wrong PIN returns 401

- [ ] **Error cases**
  - Invalid token → 404
  - Invalid state transition → 400
  - Missing PIN → 401
  - Database connection failure → 502

#### **Browser QA**

- [ ] **Checkout flow end-to-end**
  - Add products to cart
  - Fill checkout form
  - Submit and get order confirmation
  - Verify order saved in Neon (not Google Sheets)

- [ ] **Customer tracking page**
  - Use statusToken to view order
  - Verify all order details displayed correctly
  - Verify status label and description match

- [ ] **Agent update page**
  - Use updateToken with correct PIN
  - Update status through available transitions
  - Verify order updates in database
  - Test invalid PIN is rejected

#### **Build & Type Check**

- [ ] `npm run typecheck` — zero TypeScript errors
- [ ] `npm run build` — production build succeeds
- [ ] No console errors or warnings from order routes

#### **Local Development**

- [ ] Run with `vercel env run -- next dev` to load Neon env vars
- [ ] Or manually set `fastget_DATABASE_URL` in `.env.local`
- [ ] Confirm connection to Neon test database

---

## Phase 5: Cleanup & Cutover (30 min) ✅ COMPLETE

### Objective
Remove Google Apps Script/Sheets dependencies and finalize migration.

### Tasks

- [x] **Remove deprecated code**
  - ✅ Keep `/google-apps-script/` folder for reference (do NOT deploy)
  - ✅ Verified `src/lib/sheets.ts` is NOT imported anywhere in codebase
  - ✅ No Google Sheets dependencies in package.json

- [x] **Clean up environment variables**
  - ✅ No `GOOGLE_SHEETS_ID` in Vercel (never was set)
  - ✅ No `GOOGLE_APPS_SCRIPT_DEPLOYMENT_ID` in Vercel (never was set)
  - ✅ No `GOOGLE_SHEETS_API_KEY` in Vercel (never was set)
  - ✅ `fastget_DATABASE_URL` is set in all environments (dev, preview, production)

- [x] **Verify no fallback to Apps Script**
  - ✅ Searched codebase: 0 imports of `sheets.ts`
  - ✅ All order operations use `src/lib/db.ts`
  - ✅ Logs confirm Neon connection working

- [x] **Documentation for ops**
  - ✅ Created `docs/NEON_OPS.md` with complete operational guide
  - ✅ Includes: database access, common queries, schema, indexes, backup strategy
  - ✅ Added warning: "Do NOT use Google Sheets as order source of truth"

- [x] **Final verification**
  - ✅ Created test orders via API → stored in Neon
  - ✅ Customer can view orders via statusToken
  - ✅ Agent can update status via updateToken with PIN authentication

---

## Success Criteria

✅ **Customer can place order**
- Checkout form submits successfully
- Order saved to Neon with unique tokens
- Customer receives statusToken for tracking

✅ **Customer can view order**
- GET `/api/orders/:statusToken` returns complete order
- Order status page displays correctly

✅ **Agent can update order status**
- POST `/api/orders/update` with valid PIN succeeds
- Status transitions follow `VALID_STATUS_TRANSITIONS`
- Invalid transitions are rejected with 400

✅ **No breakage**
- `npm run build` succeeds
- `npm run typecheck` has zero errors
- Existing checkout/status/agent pages work without changes

✅ **Observability**
- All errors logged to console/monitoring
- No silent failures
- Database connection issues are immediately visible

✅ **Cutover complete**
- Google Apps Script code removed from runtime
- All order data in Neon, none in Sheets
- Production deployment successful

---

## Dependencies

- `@neondatabase/serverless` (for Neon connection)
- `fastget_DATABASE_URL` environment variable (from Vercel)
- TypeScript types in `src/types/index.ts`
- Existing utilities in `src/lib/utils.ts`

## Rollback Plan

If critical issues occur post-cutover:
1. Revert to previous commit with Apps Script code
2. Restore Google Sheets env vars in Vercel
3. Update API routes to use `sheets.ts` again
4. Investigate Neon issue and retry migration next day

---

## References

- **Architecture:** [ARCHITECTURE.md](ARCHITECTURE.md)
- **Order types:** [src/types/index.ts](../src/types/index.ts)
- **Database client:** [src/lib/db.ts](../src/lib/db.ts)
- **API routes:** [src/app/api/orders/](../src/app/api/orders/)
- **Neon docs:** https://neon.tech/docs/serverless/serverless-driver
