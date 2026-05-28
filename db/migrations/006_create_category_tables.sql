-- Migration 006: Create 8 category-specific product tables
-- These tables store a denormalized view of each product + its primary variant.
-- product_code is the PK (stable, matches the SKU from the Google Sheet).
-- variant_id is a soft reference back to product_variants.id so that inventory
-- lookups still work without requiring an FK that spans 8 tables.
--
-- The original products table is NOT touched — it remains the FK anchor for
-- product_variants, inventory, and wishlists.
--
-- Safe to run multiple times (all statements are idempotent).

-- ── Shared column macro (via DO block comment — actual CREATE statements below) ──
-- Each table has:
--   product_code  VARCHAR(100)  PRIMARY KEY  (= SKU from the sheet)
--   name          VARCHAR(500)  NOT NULL
--   brand         VARCHAR(255)
--   description   TEXT
--   price         INTEGER       NOT NULL  (FastGet price in paise)
--   mrp_price     INTEGER                (MRP in paise)
--   moq           INTEGER       NOT NULL DEFAULT 1
--   uom           VARCHAR(50)           (unit of measure)
--   size          VARCHAR(100)          (variant size / specs)
--   colour        VARCHAR(100)          (colour / finish)
--   remarks       TEXT
--   image_url     TEXT
--   status        VARCHAR(50)   NOT NULL DEFAULT 'active'
--   category_slug VARCHAR(100)          (original category slug for sub-filtering)
--   variant_id    UUID                  (soft ref → product_variants.id)
--   products_id   UUID                  (soft ref → products.id)
--   created_at    TIMESTAMPTZ   DEFAULT NOW()
--   updated_at    TIMESTAMPTZ   DEFAULT NOW()

-- ── 1. carpentry (combines carpentry-boards + carpentry-hardware) ──────────────
CREATE TABLE IF NOT EXISTS carpentry (
  product_code  VARCHAR(100) PRIMARY KEY,
  name          VARCHAR(500) NOT NULL,
  brand         VARCHAR(255),
  description   TEXT,
  price         INTEGER      NOT NULL,
  mrp_price     INTEGER,
  moq           INTEGER      NOT NULL DEFAULT 1,
  uom           VARCHAR(50),
  size          VARCHAR(100),
  colour        VARCHAR(100),
  remarks       TEXT,
  image_url     TEXT,
  status        VARCHAR(50)  NOT NULL DEFAULT 'active',
  category_slug VARCHAR(100),
  variant_id    UUID,
  products_id   UUID,
  created_at    TIMESTAMPTZ  DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_carpentry_brand    ON carpentry(brand);
CREATE INDEX IF NOT EXISTS idx_carpentry_status   ON carpentry(status);
CREATE INDEX IF NOT EXISTS idx_carpentry_cat_slug ON carpentry(category_slug);
CREATE INDEX IF NOT EXISTS idx_carpentry_variant  ON carpentry(variant_id);

-- ── 2. paints_and_polish ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS paints_and_polish (
  product_code  VARCHAR(100) PRIMARY KEY,
  name          VARCHAR(500) NOT NULL,
  brand         VARCHAR(255),
  description   TEXT,
  price         INTEGER      NOT NULL,
  mrp_price     INTEGER,
  moq           INTEGER      NOT NULL DEFAULT 1,
  uom           VARCHAR(50),
  size          VARCHAR(100),
  colour        VARCHAR(100),
  remarks       TEXT,
  image_url     TEXT,
  status        VARCHAR(50)  NOT NULL DEFAULT 'active',
  category_slug VARCHAR(100),
  variant_id    UUID,
  products_id   UUID,
  created_at    TIMESTAMPTZ  DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_paints_brand    ON paints_and_polish(brand);
CREATE INDEX IF NOT EXISTS idx_paints_status   ON paints_and_polish(status);
CREATE INDEX IF NOT EXISTS idx_paints_variant  ON paints_and_polish(variant_id);

-- ── 3. plumbing ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plumbing (
  product_code  VARCHAR(100) PRIMARY KEY,
  name          VARCHAR(500) NOT NULL,
  brand         VARCHAR(255),
  description   TEXT,
  price         INTEGER      NOT NULL,
  mrp_price     INTEGER,
  moq           INTEGER      NOT NULL DEFAULT 1,
  uom           VARCHAR(50),
  size          VARCHAR(100),
  colour        VARCHAR(100),
  remarks       TEXT,
  image_url     TEXT,
  status        VARCHAR(50)  NOT NULL DEFAULT 'active',
  category_slug VARCHAR(100),
  variant_id    UUID,
  products_id   UUID,
  created_at    TIMESTAMPTZ  DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_plumbing_brand   ON plumbing(brand);
CREATE INDEX IF NOT EXISTS idx_plumbing_status  ON plumbing(status);
CREATE INDEX IF NOT EXISTS idx_plumbing_variant ON plumbing(variant_id);

-- ── 4. civil_materials ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS civil_materials (
  product_code  VARCHAR(100) PRIMARY KEY,
  name          VARCHAR(500) NOT NULL,
  brand         VARCHAR(255),
  description   TEXT,
  price         INTEGER      NOT NULL,
  mrp_price     INTEGER,
  moq           INTEGER      NOT NULL DEFAULT 1,
  uom           VARCHAR(50),
  size          VARCHAR(100),
  colour        VARCHAR(100),
  remarks       TEXT,
  image_url     TEXT,
  status        VARCHAR(50)  NOT NULL DEFAULT 'active',
  category_slug VARCHAR(100),
  variant_id    UUID,
  products_id   UUID,
  created_at    TIMESTAMPTZ  DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_civil_brand   ON civil_materials(brand);
CREATE INDEX IF NOT EXISTS idx_civil_status  ON civil_materials(status);
CREATE INDEX IF NOT EXISTS idx_civil_variant ON civil_materials(variant_id);

-- ── 5. electrical ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS electrical (
  product_code  VARCHAR(100) PRIMARY KEY,
  name          VARCHAR(500) NOT NULL,
  brand         VARCHAR(255),
  description   TEXT,
  price         INTEGER      NOT NULL,
  mrp_price     INTEGER,
  moq           INTEGER      NOT NULL DEFAULT 1,
  uom           VARCHAR(50),
  size          VARCHAR(100),
  colour        VARCHAR(100),
  remarks       TEXT,
  image_url     TEXT,
  status        VARCHAR(50)  NOT NULL DEFAULT 'active',
  category_slug VARCHAR(100),
  variant_id    UUID,
  products_id   UUID,
  created_at    TIMESTAMPTZ  DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_electrical_brand   ON electrical(brand);
CREATE INDEX IF NOT EXISTS idx_electrical_status  ON electrical(status);
CREATE INDEX IF NOT EXISTS idx_electrical_variant ON electrical(variant_id);

-- ── 6. flooring_and_ceilings ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS flooring_and_ceilings (
  product_code  VARCHAR(100) PRIMARY KEY,
  name          VARCHAR(500) NOT NULL,
  brand         VARCHAR(255),
  description   TEXT,
  price         INTEGER      NOT NULL,
  mrp_price     INTEGER,
  moq           INTEGER      NOT NULL DEFAULT 1,
  uom           VARCHAR(50),
  size          VARCHAR(100),
  colour        VARCHAR(100),
  remarks       TEXT,
  image_url     TEXT,
  status        VARCHAR(50)  NOT NULL DEFAULT 'active',
  category_slug VARCHAR(100),
  variant_id    UUID,
  products_id   UUID,
  created_at    TIMESTAMPTZ  DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_flooring_brand   ON flooring_and_ceilings(brand);
CREATE INDEX IF NOT EXISTS idx_flooring_status  ON flooring_and_ceilings(status);
CREATE INDEX IF NOT EXISTS idx_flooring_variant ON flooring_and_ceilings(variant_id);

-- ── 7. glass_and_aluminium ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS glass_and_aluminium (
  product_code  VARCHAR(100) PRIMARY KEY,
  name          VARCHAR(500) NOT NULL,
  brand         VARCHAR(255),
  description   TEXT,
  price         INTEGER      NOT NULL,
  mrp_price     INTEGER,
  moq           INTEGER      NOT NULL DEFAULT 1,
  uom           VARCHAR(50),
  size          VARCHAR(100),
  colour        VARCHAR(100),
  remarks       TEXT,
  image_url     TEXT,
  status        VARCHAR(50)  NOT NULL DEFAULT 'active',
  category_slug VARCHAR(100),
  variant_id    UUID,
  products_id   UUID,
  created_at    TIMESTAMPTZ  DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_glass_brand   ON glass_and_aluminium(brand);
CREATE INDEX IF NOT EXISTS idx_glass_status  ON glass_and_aluminium(status);
CREATE INDEX IF NOT EXISTS idx_glass_variant ON glass_and_aluminium(variant_id);

-- ── 8. tools_and_machines ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tools_and_machines (
  product_code  VARCHAR(100) PRIMARY KEY,
  name          VARCHAR(500) NOT NULL,
  brand         VARCHAR(255),
  description   TEXT,
  price         INTEGER      NOT NULL,
  mrp_price     INTEGER,
  moq           INTEGER      NOT NULL DEFAULT 1,
  uom           VARCHAR(50),
  size          VARCHAR(100),
  colour        VARCHAR(100),
  remarks       TEXT,
  image_url     TEXT,
  status        VARCHAR(50)  NOT NULL DEFAULT 'active',
  category_slug VARCHAR(100),
  variant_id    UUID,
  products_id   UUID,
  created_at    TIMESTAMPTZ  DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tools_brand   ON tools_and_machines(brand);
CREATE INDEX IF NOT EXISTS idx_tools_status  ON tools_and_machines(status);
CREATE INDEX IF NOT EXISTS idx_tools_variant ON tools_and_machines(variant_id);
