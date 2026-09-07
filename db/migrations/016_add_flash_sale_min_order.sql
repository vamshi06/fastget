-- Migration 016: Add an optional minimum-order threshold to flash sales.
--
-- When sale_min_order_paise is set on a row, the sale_price only applies once
-- the OTHER items in the shopper's cart (computed at ORIGINAL, pre-discount
-- prices, excluding this row's own price — see priceOrderFromCatalog in
-- src/lib/order-pricing.ts) add up to that amount.
-- NULL means "no minimum" (existing sales keep working unchanged).
--
-- Safe to run multiple times (all statements are idempotent).

ALTER TABLE carpentry              ADD COLUMN IF NOT EXISTS sale_min_order_paise INTEGER;
ALTER TABLE paints_and_polish      ADD COLUMN IF NOT EXISTS sale_min_order_paise INTEGER;
ALTER TABLE plumbing               ADD COLUMN IF NOT EXISTS sale_min_order_paise INTEGER;
ALTER TABLE civil_materials        ADD COLUMN IF NOT EXISTS sale_min_order_paise INTEGER;
ALTER TABLE electrical             ADD COLUMN IF NOT EXISTS sale_min_order_paise INTEGER;
ALTER TABLE flooring_and_ceilings  ADD COLUMN IF NOT EXISTS sale_min_order_paise INTEGER;
ALTER TABLE glass_and_aluminium    ADD COLUMN IF NOT EXISTS sale_min_order_paise INTEGER;
ALTER TABLE tools_and_machines     ADD COLUMN IF NOT EXISTS sale_min_order_paise INTEGER;

CREATE OR REPLACE VIEW products_catalog_view AS
  SELECT product_code, name, brand, description,
         price, mrp_price, moq, uom, size, colour, remarks,
         image_url, status, category_slug, variant_id, products_id,
         'carpentry' AS source_table,
         sale_price, sale_starts_at, sale_ends_at, sale_min_order_paise
  FROM carpentry WHERE status = 'active'
UNION ALL
  SELECT product_code, name, brand, description,
         price, mrp_price, moq, uom, size, colour, remarks,
         image_url, status, category_slug, variant_id, products_id,
         'paints_and_polish' AS source_table,
         sale_price, sale_starts_at, sale_ends_at, sale_min_order_paise
  FROM paints_and_polish WHERE status = 'active'
UNION ALL
  SELECT product_code, name, brand, description,
         price, mrp_price, moq, uom, size, colour, remarks,
         image_url, status, category_slug, variant_id, products_id,
         'plumbing' AS source_table,
         sale_price, sale_starts_at, sale_ends_at, sale_min_order_paise
  FROM plumbing WHERE status = 'active'
UNION ALL
  SELECT product_code, name, brand, description,
         price, mrp_price, moq, uom, size, colour, remarks,
         image_url, status, category_slug, variant_id, products_id,
         'civil_materials' AS source_table,
         sale_price, sale_starts_at, sale_ends_at, sale_min_order_paise
  FROM civil_materials WHERE status = 'active'
UNION ALL
  SELECT product_code, name, brand, description,
         price, mrp_price, moq, uom, size, colour, remarks,
         image_url, status, category_slug, variant_id, products_id,
         'electrical' AS source_table,
         sale_price, sale_starts_at, sale_ends_at, sale_min_order_paise
  FROM electrical WHERE status = 'active'
UNION ALL
  SELECT product_code, name, brand, description,
         price, mrp_price, moq, uom, size, colour, remarks,
         image_url, status, category_slug, variant_id, products_id,
         'flooring_and_ceilings' AS source_table,
         sale_price, sale_starts_at, sale_ends_at, sale_min_order_paise
  FROM flooring_and_ceilings WHERE status = 'active'
UNION ALL
  SELECT product_code, name, brand, description,
         price, mrp_price, moq, uom, size, colour, remarks,
         image_url, status, category_slug, variant_id, products_id,
         'glass_and_aluminium' AS source_table,
         sale_price, sale_starts_at, sale_ends_at, sale_min_order_paise
  FROM glass_and_aluminium WHERE status = 'active'
UNION ALL
  SELECT product_code, name, brand, description,
         price, mrp_price, moq, uom, size, colour, remarks,
         image_url, status, category_slug, variant_id, products_id,
         'tools_and_machines' AS source_table,
         sale_price, sale_starts_at, sale_ends_at, sale_min_order_paise
  FROM tools_and_machines WHERE status = 'active';
