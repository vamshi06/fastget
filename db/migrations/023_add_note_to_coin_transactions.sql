-- Migration 023: Reason note on coin ledger entries.
--
-- Admins must now give a reason when they manually add or subtract coins
-- (/admin/coins). The note is stored on the ledger row so the history shows
-- why each correction was made. NULL for automatic entries (order delivered,
-- redemption, redemption refund) and for adjustments made before this column.
--
-- Safe to run multiple times (all statements are idempotent).

ALTER TABLE coin_transactions ADD COLUMN IF NOT EXISTS note TEXT;
