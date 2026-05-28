-- Migration 005: Drop the name+category partial unique index.
-- This index was created for the old grouping-based import (one parent product
-- per {name, category} pair). The new import uses product_code as the unique key
-- (one product per Product Code / SKU), so the name+category constraint is no
-- longer correct — multiple products with the same name in the same category are
-- now valid (e.g., "Plywood (4mm)" from CenturyPly vs Greenply).

DROP INDEX IF EXISTS uq_products_name_category;
