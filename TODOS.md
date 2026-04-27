# Fastget TODOS

## Database Migration (Post-Pilot)

### Migrate orders from Google Sheets to PostgreSQL

**What:** Migrate orders from the launch Google Sheet plus Apps Script backend to a real database and admin dashboard after pilot demand is proven.

**Why:** Google Sheets is good for proving demand. It is weak for audit trails, multiple agents, payment collection, refunds, customer history, and higher order volume.

**Migration path:**
1. Set up PostgreSQL (local dev → Supabase for prod)
2. Create orders table schema
3. Build admin dashboard UI
4. Export historical orders from Sheets
5. Cutover to database

**Trigger:** After 7-day pilot if repeat demand is real, or earlier if order volume exceeds manual ops capacity.

**Depends on:** Pilot metrics, final order schema, actual repeat-order behavior.

**Priority:** P1 after pilot validation
**Effort:** M (Human: ~2-4 days / CC: ~2-4 hours after schema is clear)

---

## Features

### Order Management
- [ ] Create order form UI
- [ ] Order status tracking (pending → confirmed → fulfilled → delivered)
- [ ] Customer notifications (email/SMS)
- [ ] Payment integration (Stripe)

### Admin Dashboard
- [ ] Order list view with filters
- [ ] Order detail view
- [ ] Customer management
- [ ] Analytics (orders/day, revenue, top customers)

### Integrations
- [ ] Google Sheets sync (bidirectional during transition)
- [ ] Apps Script webhook handlers
- [ ] Email service (SendGrid/Resend)

---

## Infrastructure

### MVP (Current)
- [x] Next.js scaffolding
- [ ] Google Sheets API integration
- [ ] Basic order CRUD

### Future
- [ ] PostgreSQL database
- [ ] Authentication (Clerk/Auth0)
- [ ] API rate limiting
- [ ] Error monitoring (Sentry)

---

## Documentation

- [ ] API documentation
- [ ] Deployment guide
- [ ] Runbook for ops team
