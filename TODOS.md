# Fastget TODOS

## Current P0: Neon Order Storage Cutover

### Replace Apps Script order backend with Neon Postgres

**What:** Move order create/read/update from Google Apps Script and Google Sheets to the Neon Postgres database connected through Vercel.

**Why:** Apps Script deployment/access failures are blocking checkout. Order capture must be boring, observable, and owned by the app.

**Implementation path:**

1. Create the `orders` table from `docs/ARCHITECTURE.md`.
2. Add `src/lib/orders-db.ts` using `@neondatabase/serverless`.
3. Update `/api/orders`, `/api/orders/[token]`, and `/api/orders/update` to use Neon.
4. Keep response shapes stable for the existing checkout and status pages.
5. Validate `AGENT_PIN` server-side for agent updates.
6. Remove Apps Script/Sheets env vars after cutover.
7. Run `npm run build`, `npm run typecheck`, and browser QA on checkout.

**Depends on:** Neon env vars from Vercel, `fastget_DATABASE_URL` available locally and in production.

**Priority:** P0
**Effort:** M (Human: ~1 day / CC: ~45-90 min)

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
- [ ] Basic order CRUD on Neon
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
