-- Migration 012: Add flash-sale columns to the 8 category tables
-- (exposed via products_catalog_view in migration 016).
--
-- A flash sale is defined per-row by (sale_price, sale_starts_at, sale_ends_at).
-- It is active whenever NOW() falls inside [sale_starts_at, sale_ends_at].
-- Effective-price computation happens in application code (src/lib/products.ts)
-- and in the checkout trusted-price query, both keyed off these raw columns -
-- no cron job is needed, the sale reverts itself the moment sale_ends_at passes.
--
-- Safe to run multiple times (all statements are idempotent).

ALTER TABLE carpentry              ADD COLUMN IF NOT EXISTS sale_price INTEGER;
ALTER TABLE carpentry              ADD COLUMN IF NOT EXISTS sale_starts_at TIMESTAMPTZ;
ALTER TABLE carpentry              ADD COLUMN IF NOT EXISTS sale_ends_at TIMESTAMPTZ;

ALTER TABLE paints_and_polish      ADD COLUMN IF NOT EXISTS sale_price INTEGER;
ALTER TABLE paints_and_polish      ADD COLUMN IF NOT EXISTS sale_starts_at TIMESTAMPTZ;
ALTER TABLE paints_and_polish      ADD COLUMN IF NOT EXISTS sale_ends_at TIMESTAMPTZ;

ALTER TABLE plumbing               ADD COLUMN IF NOT EXISTS sale_price INTEGER;
ALTER TABLE plumbing               ADD COLUMN IF NOT EXISTS sale_starts_at TIMESTAMPTZ;
ALTER TABLE plumbing               ADD COLUMN IF NOT EXISTS sale_ends_at TIMESTAMPTZ;

ALTER TABLE civil_materials        ADD COLUMN IF NOT EXISTS sale_price INTEGER;
ALTER TABLE civil_materials        ADD COLUMN IF NOT EXISTS sale_starts_at TIMESTAMPTZ;
ALTER TABLE civil_materials        ADD COLUMN IF NOT EXISTS sale_ends_at TIMESTAMPTZ;

ALTER TABLE electrical             ADD COLUMN IF NOT EXISTS sale_price INTEGER;
ALTER TABLE electrical             ADD COLUMN IF NOT EXISTS sale_starts_at TIMESTAMPTZ;
ALTER TABLE electrical             ADD COLUMN IF NOT EXISTS sale_ends_at TIMESTAMPTZ;

ALTER TABLE flooring_and_ceilings  ADD COLUMN IF NOT EXISTS sale_price INTEGER;
ALTER TABLE flooring_and_ceilings  ADD COLUMN IF NOT EXISTS sale_starts_at TIMESTAMPTZ;
ALTER TABLE flooring_and_ceilings  ADD COLUMN IF NOT EXISTS sale_ends_at TIMESTAMPTZ;

ALTER TABLE glass_and_aluminium    ADD COLUMN IF NOT EXISTS sale_price INTEGER;
ALTER TABLE glass_and_aluminium    ADD COLUMN IF NOT EXISTS sale_starts_at TIMESTAMPTZ;
ALTER TABLE glass_and_aluminium    ADD COLUMN IF NOT EXISTS sale_ends_at TIMESTAMPTZ;

ALTER TABLE tools_and_machines     ADD COLUMN IF NOT EXISTS sale_price INTEGER;
ALTER TABLE tools_and_machines     ADD COLUMN IF NOT EXISTS sale_starts_at TIMESTAMPTZ;
ALTER TABLE tools_and_machines     ADD COLUMN IF NOT EXISTS sale_ends_at TIMESTAMPTZ;

-- The view itself (exposing these columns) is defined in migration 016, not
-- here - re-creating an older, shorter version of it fails once later
-- migrations have added columns. See the note in 008.
