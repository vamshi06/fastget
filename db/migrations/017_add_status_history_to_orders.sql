-- Migration 017: Add status_history to orders.
--
-- Records a timestamped entry every time an order's status changes (received,
-- eta_assigned, out_for_delivery, delivered, cancelled), so the admin UI can
-- show a status timeline and how long each stage - and the order overall -
-- took. DEFAULT '[]' backfills existing rows with an empty history, and the
-- app falls back to a single 'received' entry at created_at when it's empty.
--
-- Safe to run multiple times (idempotent).

ALTER TABLE orders ADD COLUMN IF NOT EXISTS status_history JSONB NOT NULL DEFAULT '[]'::jsonb;
