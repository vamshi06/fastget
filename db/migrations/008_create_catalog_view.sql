-- Migration 008: Create products_catalog_view
-- UNION ALL of all 8 category tables, exposed with the same column aliases
-- that catalogRowToProduct() and categoryTableRowToProduct() expect.
-- Replaces the need to query the products table for catalog listing.

CREATE OR REPLACE VIEW products_catalog_view AS
  SELECT product_code, name, brand, description,
         price, mrp_price, moq, uom, size, colour, remarks,
         image_url, status, category_slug, variant_id, products_id,
         'carpentry' AS source_table
  FROM carpentry WHERE status = 'active'
UNION ALL
  SELECT product_code, name, brand, description,
         price, mrp_price, moq, uom, size, colour, remarks,
         image_url, status, category_slug, variant_id, products_id,
         'paints_and_polish' AS source_table
  FROM paints_and_polish WHERE status = 'active'
UNION ALL
  SELECT product_code, name, brand, description,
         price, mrp_price, moq, uom, size, colour, remarks,
         image_url, status, category_slug, variant_id, products_id,
         'plumbing' AS source_table
  FROM plumbing WHERE status = 'active'
UNION ALL
  SELECT product_code, name, brand, description,
         price, mrp_price, moq, uom, size, colour, remarks,
         image_url, status, category_slug, variant_id, products_id,
         'civil_materials' AS source_table
  FROM civil_materials WHERE status = 'active'
UNION ALL
  SELECT product_code, name, brand, description,
         price, mrp_price, moq, uom, size, colour, remarks,
         image_url, status, category_slug, variant_id, products_id,
         'electrical' AS source_table
  FROM electrical WHERE status = 'active'
UNION ALL
  SELECT product_code, name, brand, description,
         price, mrp_price, moq, uom, size, colour, remarks,
         image_url, status, category_slug, variant_id, products_id,
         'flooring_and_ceilings' AS source_table
  FROM flooring_and_ceilings WHERE status = 'active'
UNION ALL
  SELECT product_code, name, brand, description,
         price, mrp_price, moq, uom, size, colour, remarks,
         image_url, status, category_slug, variant_id, products_id,
         'glass_and_aluminium' AS source_table
  FROM glass_and_aluminium WHERE status = 'active'
UNION ALL
  SELECT product_code, name, brand, description,
         price, mrp_price, moq, uom, size, colour, remarks,
         image_url, status, category_slug, variant_id, products_id,
         'tools_and_machines' AS source_table
  FROM tools_and_machines WHERE status = 'active';
