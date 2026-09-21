-- Migration 020: Add discount to orders.
--
-- Records the rupee amount taken off an order by the first-order coupon
-- (₹200 off orders of ₹449+, applied once per user on their first order).
-- DEFAULT 0 backfills existing rows, which never had a coupon applied.
--
-- Safe to run multiple times (idempotent).

ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount INTEGER NOT NULL DEFAULT 0;
