-- Migration 003: Create inventory table
-- Safe to run multiple times (IF NOT EXISTS guard)

CREATE TABLE IF NOT EXISTS inventory (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id          UUID        NOT NULL UNIQUE REFERENCES product_variants(id) ON DELETE CASCADE,
  stock_quantity      INTEGER     NOT NULL DEFAULT 0,
  reserved_quantity   INTEGER     NOT NULL DEFAULT 0,
  reorder_threshold   INTEGER     NOT NULL DEFAULT 5,
  warehouse_location  VARCHAR(100),
  last_restocked_at   TIMESTAMPTZ,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inventory_variant_id ON inventory(variant_id);
