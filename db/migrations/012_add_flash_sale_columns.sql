-- Migration 012: Add flash-sale columns to the 8 category tables and expose
-- them via products_catalog_view.
--
-- A flash sale is defined per-row by (sale_price, sale_starts_at, sale_ends_at).
-- It is active whenever NOW() falls inside [sale_starts_at, sale_ends_at].
-- Effective-price computation happens in application code (src/lib/products.ts)
-- and in the checkout trusted-price query, both keyed off these raw columns —
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

CREATE OR REPLACE VIEW products_catalog_view AS
  SELECT product_code, name, brand, description,
         price, mrp_price, moq, uom, size, colour, remarks,
         image_url, status, category_slug, variant_id, products_id,
         'carpentry' AS source_table,
         sale_price, sale_starts_at, sale_ends_at
  FROM carpentry WHERE status = 'active'
UNION ALL
  SELECT product_code, name, brand, description,
         price, mrp_price, moq, uom, size, colour, remarks,
         image_url, status, category_slug, variant_id, products_id,
         'paints_and_polish' AS source_table,
         sale_price, sale_starts_at, sale_ends_at
  FROM paints_and_polish WHERE status = 'active'
UNION ALL
  SELECT product_code, name, brand, description,
         price, mrp_price, moq, uom, size, colour, remarks,
         image_url, status, category_slug, variant_id, products_id,
         'plumbing' AS source_table,
         sale_price, sale_starts_at, sale_ends_at
  FROM plumbing WHERE status = 'active'
UNION ALL
  SELECT product_code, name, brand, description,
         price, mrp_price, moq, uom, size, colour, remarks,
         image_url, status, category_slug, variant_id, products_id,
         'civil_materials' AS source_table,
         sale_price, sale_starts_at, sale_ends_at
  FROM civil_materials WHERE status = 'active'
UNION ALL
  SELECT product_code, name, brand, description,
         price, mrp_price, moq, uom, size, colour, remarks,
         image_url, status, category_slug, variant_id, products_id,
         'electrical' AS source_table,
         sale_price, sale_starts_at, sale_ends_at
  FROM electrical WHERE status = 'active'
UNION ALL
  SELECT product_code, name, brand, description,
         price, mrp_price, moq, uom, size, colour, remarks,
         image_url, status, category_slug, variant_id, products_id,
         'flooring_and_ceilings' AS source_table,
         sale_price, sale_starts_at, sale_ends_at
  FROM flooring_and_ceilings WHERE status = 'active'
UNION ALL
  SELECT product_code, name, brand, description,
         price, mrp_price, moq, uom, size, colour, remarks,
         image_url, status, category_slug, variant_id, products_id,
         'glass_and_aluminium' AS source_table,
         sale_price, sale_starts_at, sale_ends_at
  FROM glass_and_aluminium WHERE status = 'active'
UNION ALL
  SELECT product_code, name, brand, description,
         price, mrp_price, moq, uom, size, colour, remarks,
         image_url, status, category_slug, variant_id, products_id,
         'tools_and_machines' AS source_table,
         sale_price, sale_starts_at, sale_ends_at
  FROM tools_and_machines WHERE status = 'active';
