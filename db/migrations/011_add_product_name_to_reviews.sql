-- Migration 011: store a denormalized product name snapshot on each review
--
-- Reviews already reference product_code, but storing the name too avoids a
-- join back to products for display and survives the product being renamed
-- or removed later, matching the wishlists.product_data snapshot pattern.

ALTER TABLE product_reviews
  ADD COLUMN IF NOT EXISTS product_name VARCHAR(255) NOT NULL DEFAULT '';
