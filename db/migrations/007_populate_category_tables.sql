-- Migration 007: Populate category tables from products + product_variants.
-- This is a READ-ONLY migration: it only INSERTs new rows.
-- ON CONFLICT DO UPDATE so re-runs sync any price/description changes.
-- The original products table is NOT modified.

-- Helper: extract attributes JSONB safely
-- pv.attributes is stored as JSONB: {"size":"4mm","colour":"Natural","uom":"Sheet","remarks":"..."}

-- ── 1. carpentry (carpentry-boards + carpentry-hardware) ──────────────────────
INSERT INTO carpentry (
  product_code, name, brand, description,
  price, mrp_price, moq,
  uom, size, colour, remarks, image_url,
  status, category_slug, variant_id, products_id
)
SELECT
  p.product_code,
  p.name,
  p.brand,
  p.description,
  COALESCE(pv.price_override, p.price)    AS price,
  pv.mrp_price,
  COALESCE(pv.moq, 1)                     AS moq,
  COALESCE(pv.attributes->>'uom', p.uom)  AS uom,
  pv.attributes->>'size'                  AS size,
  pv.attributes->>'colour'                AS colour,
  pv.attributes->>'remarks'               AS remarks,
  p.image_url,
  p.status,
  c.slug                                  AS category_slug,
  pv.id                                   AS variant_id,
  p.id                                    AS products_id
FROM products p
JOIN categories c ON p.category_id = c.id
LEFT JOIN product_variants pv ON pv.product_id = p.id
WHERE c.slug IN ('carpentry-boards', 'carpentry-hardware')
  AND p.product_code IS NOT NULL
ON CONFLICT (product_code) DO UPDATE SET
  name          = EXCLUDED.name,
  brand         = EXCLUDED.brand,
  description   = EXCLUDED.description,
  price         = EXCLUDED.price,
  mrp_price     = EXCLUDED.mrp_price,
  moq           = EXCLUDED.moq,
  uom           = EXCLUDED.uom,
  size          = EXCLUDED.size,
  colour        = EXCLUDED.colour,
  remarks       = EXCLUDED.remarks,
  image_url     = EXCLUDED.image_url,
  status        = EXCLUDED.status,
  category_slug = EXCLUDED.category_slug,
  variant_id    = EXCLUDED.variant_id,
  products_id   = EXCLUDED.products_id,
  updated_at    = NOW();

-- ── 2. paints_and_polish (paints) ─────────────────────────────────────────────
INSERT INTO paints_and_polish (
  product_code, name, brand, description,
  price, mrp_price, moq,
  uom, size, colour, remarks, image_url,
  status, category_slug, variant_id, products_id
)
SELECT
  p.product_code, p.name, p.brand, p.description,
  COALESCE(pv.price_override, p.price), pv.mrp_price, COALESCE(pv.moq, 1),
  COALESCE(pv.attributes->>'uom', p.uom), pv.attributes->>'size',
  pv.attributes->>'colour', pv.attributes->>'remarks', p.image_url,
  p.status, c.slug, pv.id, p.id
FROM products p
JOIN categories c ON p.category_id = c.id
LEFT JOIN product_variants pv ON pv.product_id = p.id
WHERE c.slug = 'paints' AND p.product_code IS NOT NULL
ON CONFLICT (product_code) DO UPDATE SET
  name=EXCLUDED.name, brand=EXCLUDED.brand, description=EXCLUDED.description,
  price=EXCLUDED.price, mrp_price=EXCLUDED.mrp_price, moq=EXCLUDED.moq,
  uom=EXCLUDED.uom, size=EXCLUDED.size, colour=EXCLUDED.colour,
  remarks=EXCLUDED.remarks, image_url=EXCLUDED.image_url, status=EXCLUDED.status,
  category_slug=EXCLUDED.category_slug, variant_id=EXCLUDED.variant_id,
  products_id=EXCLUDED.products_id, updated_at=NOW();

-- ── 3. plumbing ────────────────────────────────────────────────────────────────
INSERT INTO plumbing (
  product_code, name, brand, description,
  price, mrp_price, moq,
  uom, size, colour, remarks, image_url,
  status, category_slug, variant_id, products_id
)
SELECT
  p.product_code, p.name, p.brand, p.description,
  COALESCE(pv.price_override, p.price), pv.mrp_price, COALESCE(pv.moq, 1),
  COALESCE(pv.attributes->>'uom', p.uom), pv.attributes->>'size',
  pv.attributes->>'colour', pv.attributes->>'remarks', p.image_url,
  p.status, c.slug, pv.id, p.id
FROM products p
JOIN categories c ON p.category_id = c.id
LEFT JOIN product_variants pv ON pv.product_id = p.id
WHERE c.slug = 'plumbing' AND p.product_code IS NOT NULL
ON CONFLICT (product_code) DO UPDATE SET
  name=EXCLUDED.name, brand=EXCLUDED.brand, description=EXCLUDED.description,
  price=EXCLUDED.price, mrp_price=EXCLUDED.mrp_price, moq=EXCLUDED.moq,
  uom=EXCLUDED.uom, size=EXCLUDED.size, colour=EXCLUDED.colour,
  remarks=EXCLUDED.remarks, image_url=EXCLUDED.image_url, status=EXCLUDED.status,
  category_slug=EXCLUDED.category_slug, variant_id=EXCLUDED.variant_id,
  products_id=EXCLUDED.products_id, updated_at=NOW();

-- ── 4. civil_materials ─────────────────────────────────────────────────────────
INSERT INTO civil_materials (
  product_code, name, brand, description,
  price, mrp_price, moq,
  uom, size, colour, remarks, image_url,
  status, category_slug, variant_id, products_id
)
SELECT
  p.product_code, p.name, p.brand, p.description,
  COALESCE(pv.price_override, p.price), pv.mrp_price, COALESCE(pv.moq, 1),
  COALESCE(pv.attributes->>'uom', p.uom), pv.attributes->>'size',
  pv.attributes->>'colour', pv.attributes->>'remarks', p.image_url,
  p.status, c.slug, pv.id, p.id
FROM products p
JOIN categories c ON p.category_id = c.id
LEFT JOIN product_variants pv ON pv.product_id = p.id
WHERE c.slug = 'civil-materials' AND p.product_code IS NOT NULL
ON CONFLICT (product_code) DO UPDATE SET
  name=EXCLUDED.name, brand=EXCLUDED.brand, description=EXCLUDED.description,
  price=EXCLUDED.price, mrp_price=EXCLUDED.mrp_price, moq=EXCLUDED.moq,
  uom=EXCLUDED.uom, size=EXCLUDED.size, colour=EXCLUDED.colour,
  remarks=EXCLUDED.remarks, image_url=EXCLUDED.image_url, status=EXCLUDED.status,
  category_slug=EXCLUDED.category_slug, variant_id=EXCLUDED.variant_id,
  products_id=EXCLUDED.products_id, updated_at=NOW();

-- ── 5. electrical ──────────────────────────────────────────────────────────────
INSERT INTO electrical (
  product_code, name, brand, description,
  price, mrp_price, moq,
  uom, size, colour, remarks, image_url,
  status, category_slug, variant_id, products_id
)
SELECT
  p.product_code, p.name, p.brand, p.description,
  COALESCE(pv.price_override, p.price), pv.mrp_price, COALESCE(pv.moq, 1),
  COALESCE(pv.attributes->>'uom', p.uom), pv.attributes->>'size',
  pv.attributes->>'colour', pv.attributes->>'remarks', p.image_url,
  p.status, c.slug, pv.id, p.id
FROM products p
JOIN categories c ON p.category_id = c.id
LEFT JOIN product_variants pv ON pv.product_id = p.id
WHERE c.slug = 'electrical' AND p.product_code IS NOT NULL
ON CONFLICT (product_code) DO UPDATE SET
  name=EXCLUDED.name, brand=EXCLUDED.brand, description=EXCLUDED.description,
  price=EXCLUDED.price, mrp_price=EXCLUDED.mrp_price, moq=EXCLUDED.moq,
  uom=EXCLUDED.uom, size=EXCLUDED.size, colour=EXCLUDED.colour,
  remarks=EXCLUDED.remarks, image_url=EXCLUDED.image_url, status=EXCLUDED.status,
  category_slug=EXCLUDED.category_slug, variant_id=EXCLUDED.variant_id,
  products_id=EXCLUDED.products_id, updated_at=NOW();

-- ── 6. flooring_and_ceilings ──────────────────────────────────────────────────
INSERT INTO flooring_and_ceilings (
  product_code, name, brand, description,
  price, mrp_price, moq,
  uom, size, colour, remarks, image_url,
  status, category_slug, variant_id, products_id
)
SELECT
  p.product_code, p.name, p.brand, p.description,
  COALESCE(pv.price_override, p.price), pv.mrp_price, COALESCE(pv.moq, 1),
  COALESCE(pv.attributes->>'uom', p.uom), pv.attributes->>'size',
  pv.attributes->>'colour', pv.attributes->>'remarks', p.image_url,
  p.status, c.slug, pv.id, p.id
FROM products p
JOIN categories c ON p.category_id = c.id
LEFT JOIN product_variants pv ON pv.product_id = p.id
WHERE c.slug = 'flooring-ceilings' AND p.product_code IS NOT NULL
ON CONFLICT (product_code) DO UPDATE SET
  name=EXCLUDED.name, brand=EXCLUDED.brand, description=EXCLUDED.description,
  price=EXCLUDED.price, mrp_price=EXCLUDED.mrp_price, moq=EXCLUDED.moq,
  uom=EXCLUDED.uom, size=EXCLUDED.size, colour=EXCLUDED.colour,
  remarks=EXCLUDED.remarks, image_url=EXCLUDED.image_url, status=EXCLUDED.status,
  category_slug=EXCLUDED.category_slug, variant_id=EXCLUDED.variant_id,
  products_id=EXCLUDED.products_id, updated_at=NOW();

-- ── 7. glass_and_aluminium ────────────────────────────────────────────────────
INSERT INTO glass_and_aluminium (
  product_code, name, brand, description,
  price, mrp_price, moq,
  uom, size, colour, remarks, image_url,
  status, category_slug, variant_id, products_id
)
SELECT
  p.product_code, p.name, p.brand, p.description,
  COALESCE(pv.price_override, p.price), pv.mrp_price, COALESCE(pv.moq, 1),
  COALESCE(pv.attributes->>'uom', p.uom), pv.attributes->>'size',
  pv.attributes->>'colour', pv.attributes->>'remarks', p.image_url,
  p.status, c.slug, pv.id, p.id
FROM products p
JOIN categories c ON p.category_id = c.id
LEFT JOIN product_variants pv ON pv.product_id = p.id
WHERE c.slug = 'glass-aluminium' AND p.product_code IS NOT NULL
ON CONFLICT (product_code) DO UPDATE SET
  name=EXCLUDED.name, brand=EXCLUDED.brand, description=EXCLUDED.description,
  price=EXCLUDED.price, mrp_price=EXCLUDED.mrp_price, moq=EXCLUDED.moq,
  uom=EXCLUDED.uom, size=EXCLUDED.size, colour=EXCLUDED.colour,
  remarks=EXCLUDED.remarks, image_url=EXCLUDED.image_url, status=EXCLUDED.status,
  category_slug=EXCLUDED.category_slug, variant_id=EXCLUDED.variant_id,
  products_id=EXCLUDED.products_id, updated_at=NOW();

-- ── 8. tools_and_machines ─────────────────────────────────────────────────────
INSERT INTO tools_and_machines (
  product_code, name, brand, description,
  price, mrp_price, moq,
  uom, size, colour, remarks, image_url,
  status, category_slug, variant_id, products_id
)
SELECT
  p.product_code, p.name, p.brand, p.description,
  COALESCE(pv.price_override, p.price), pv.mrp_price, COALESCE(pv.moq, 1),
  COALESCE(pv.attributes->>'uom', p.uom), pv.attributes->>'size',
  pv.attributes->>'colour', pv.attributes->>'remarks', p.image_url,
  p.status, c.slug, pv.id, p.id
FROM products p
JOIN categories c ON p.category_id = c.id
LEFT JOIN product_variants pv ON pv.product_id = p.id
WHERE c.slug = 'tools-machines' AND p.product_code IS NOT NULL
ON CONFLICT (product_code) DO UPDATE SET
  name=EXCLUDED.name, brand=EXCLUDED.brand, description=EXCLUDED.description,
  price=EXCLUDED.price, mrp_price=EXCLUDED.mrp_price, moq=EXCLUDED.moq,
  uom=EXCLUDED.uom, size=EXCLUDED.size, colour=EXCLUDED.colour,
  remarks=EXCLUDED.remarks, image_url=EXCLUDED.image_url, status=EXCLUDED.status,
  category_slug=EXCLUDED.category_slug, variant_id=EXCLUDED.variant_id,
  products_id=EXCLUDED.products_id, updated_at=NOW();
