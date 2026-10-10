-- Migration 028: Variant families - sizes of the same item shown as one product.
-- (Comments here must not contain semicolons - scripts/sync-schema.ts splits on them.)
--
-- Each size stays its own product row (own product_code, price, MRP, stock,
-- MOQ, image, flash sale - so cart, checkout, orders and invoices are
-- unchanged). This table links sizes that belong together:
--   product_code  - the size (a category-table product_code, one family at most)
--   family_id     - shared by every size of the same item
--   option_label  - what the customer picks, e.g. '18"', '4 Litre', 'Cup 35mm - Black'
--
-- The storefront shows a family as one card (its cheapest in-stock size,
-- "from ₹X") with a size sheet, and the product page shows size buttons.
-- Families are created and edited in the admin (/admin/products/families and
-- each product's edit page). Before this migration runs the catalog simply
-- isn't grouped.
--
-- Safe to run multiple times (all statements are idempotent).

CREATE TABLE IF NOT EXISTS product_family_members (
  product_code  VARCHAR(100) PRIMARY KEY,
  family_id     UUID         NOT NULL,
  option_label  VARCHAR(100) NOT NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_family_members_family ON product_family_members(family_id);
