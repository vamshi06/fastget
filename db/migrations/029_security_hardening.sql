-- Migration 029: security hardening (payment replay + session revocation).
-- (Comments here must not contain semicolons - scripts/sync-schema.ts splits on them.)
--
-- uq_orders_razorpay_payment_id - one Razorpay payment pays for exactly one
--   order. Without it, replaying a verified payment to /api/payment/verify-payment
--   or /api/payment/callback created a new paid order each time. The app also
--   checks before inserting (src/lib/paid-order.ts), but only this index closes
--   the race between two requests sent together.
--   If this statement fails with "could not create unique index", some payment
--   already has two orders - find them with
--     SELECT razorpay_payment_id, array_agg(id) FROM orders
--     WHERE razorpay_payment_id IS NOT NULL GROUP BY 1 HAVING COUNT(*) > 1
--   cancel the duplicates' payment ids by hand, then re-run.
--
-- users.sessions_valid_after - login sessions issued before this time are
--   rejected (src/lib/auth.ts getSession). Set on password reset so a reset
--   signs out every other device. NULL = no cut-off.
--
-- The app works before this runs (the payment pre-check still applies, the
-- session cut-off is skipped) - but run it before deploying.
--
-- Safe to run multiple times (all statements are idempotent).

ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_razorpay_payment_id ON orders(razorpay_payment_id) WHERE razorpay_payment_id IS NOT NULL;

ALTER TABLE users ADD COLUMN IF NOT EXISTS sessions_valid_after TIMESTAMPTZ;
