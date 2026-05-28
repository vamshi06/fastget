-- Migration 004: Add product_code column to products table
-- product_code stores the original SKU/Product Code from the Google Sheet.
-- It serves as the idempotency key for the catalogue import pipeline:
-- every unique Product Code → exactly one product row.

ALTER TABLE products ADD COLUMN IF NOT EXISTS product_code VARCHAR(100);

-- Unique partial index (allows NULLs for legacy rows, enforces uniqueness for imported rows)
CREATE UNIQUE INDEX IF NOT EXISTS uq_products_product_code
  ON products (product_code)
  WHERE product_code IS NOT NULL;
