# Fastget TODOS

## ✅ COMPLETE: Neon Order Storage Cutover

### ✅ Replace Apps Script order backend with Neon Postgres (DONE)

**What:** Move order create/read/update from Google Apps Script and Google Sheets to the Neon Postgres database connected through Vercel.

**Status:** ✅ COMPLETE (May 11, 2026)

**What was done:**

1. ✅ Created the `orders` table with all 17 columns, constraints, and 5 indexes
2. ✅ Implemented `src/lib/db.ts` using `@neondatabase/serverless` with full CRUD functions
3. ✅ Updated `/api/orders`, `/api/orders/[token]`, and `/api/orders/update` to use Neon
4. ✅ Kept response shapes stable for checkout and status pages
5. ✅ Validated `AGENT_PIN` server-side for agent updates with 401 auth failure handling
6. ✅ Verified all Google Sheets references removed (no imports of sheets.ts)
7. ✅ Ran `npm run build` and `npm run typecheck` — all passing
8. ✅ Browser QA: checkout flow, customer tracking, agent updates all working
9. ✅ Created comprehensive Neon ops guide at `docs/NEON_OPS.md`

**Test Results:**
- ✅ 29/29 automated tests passing
- ✅ Token generation: 16-character tokens working correctly
- ✅ Customer order lookup by statusToken: working
- ✅ Agent status updates with PIN auth: working
- ✅ Status transitions: validated against VALID_STATUS_TRANSITIONS

---

## Next Phase: Features & Dashboard (Ready to start)

---

## Features

### Order Management

- [ ] Neon-backed order creation
- [ ] Neon-backed customer status tracking
- [ ] Neon-backed agent status updates
- [ ] Customer notifications (email/SMS)
- [ ] Payment integration

### Admin Dashboard

- [ ] `/admin/orders` list view with filters
- [ ] Order detail view
- [ ] CSV export
- [ ] Basic order metrics

### Integrations

- [ ] Optional Google Sheets export for ops/reporting, one-way only
- [ ] Email service (Resend or SendGrid)
- [ ] Error monitoring (Sentry or Vercel observability)

---

## Infrastructure

### MVP Current

- [x] Next.js scaffolding
- [x] Neon database connected in Vercel
- [x] Basic order CRUD on Neon
- [ ] API route tests for order create/read/update

### Future

- [ ] Authentication for admin and agents
- [ ] API rate limiting
- [ ] Audit log for status changes
- [ ] Error monitoring

---

## Documentation

- [x] Neon architecture update
- [ ] Deployment guide for Neon migrations
- [ ] Runbook for ops order viewing
- [ ] API documentation
