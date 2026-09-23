-- Migration 021: Create product_translations table.
--
-- Stores localized product names / descriptions keyed by product_code (the
-- same stable SKU used by the 8 category tables). One row per (product, locale).
-- Catalog queries LEFT JOIN this table and COALESCE back to the English name,
-- so a product with no translation simply shows in English.
--
-- reviewed = FALSE marks machine translations (scripts/translate-products.ts)
-- that an admin has not checked yet. Saving from the admin edit form sets it TRUE,
-- and the translation script never overwrites reviewed rows.
--
-- Safe to run multiple times (idempotent).

CREATE TABLE IF NOT EXISTS product_translations (
  product_code VARCHAR(100) NOT NULL,
  locale       VARCHAR(10)  NOT NULL,
  name         VARCHAR(500) NOT NULL,
  description  TEXT,
  reviewed     BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ  DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  DEFAULT NOW(),
  PRIMARY KEY (product_code, locale)
);

CREATE INDEX IF NOT EXISTS idx_product_translations_locale ON product_translations(locale);
