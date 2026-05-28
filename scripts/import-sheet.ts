#!/usr/bin/env tsx
/**
 * import-sheet.ts
 * Ingests the FastGet catalogue into Neon PostgreSQL.
 *
 * Data model: 1 sheet row → 1 product (keyed on product_code = SKU)
 *                        → 1 product_variant (keyed on sku)
 *                        → 1 inventory row
 *
 * UPSERT keys:
 *   categories      → slug              (UNIQUE)
 *   products        → product_code      (UNIQUE partial index, new in migration 004)
 *   product_variants → sku              (UNIQUE)
 *   inventory       → variant_id        (UNIQUE)
 *
 * Phase 0: Remove legacy products that have no product_code (created by the
 *          old grouping logic). Their variants + inventory cascade-delete.
 *
 * Usage:  npm run import-sheet
 *
 * Optional env:
 *   GOOGLE_SHEETS_API_KEY  — fetch live data from the sheet
 *   DRY_RUN=1              — preview without writing
 *   SKIP_CLEANUP=1         — skip Phase 0 legacy cleanup
 */

import { neon } from '@neondatabase/serverless';
import { CATALOGUE_ROWS, CatalogueRow } from './data/catalogue';

// ─── Config ──────────────────────────────────────────────────────────────────

const DATABASE_URL = process.env.DATABASE_URL || process.env.fastget_DATABASE_URL;

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL or fastget_DATABASE_URL is required.');
  process.exit(1);
}

const DRY_RUN      = process.env.DRY_RUN      === '1';
const SKIP_CLEANUP = process.env.SKIP_CLEANUP  === '1';
const BATCH_SIZE   = 50;
const SHEET_ID     = '1j31RxlsS_uezMEkSWTsgFho7IMBzeDo-KRKfwA25J8o';

const unpooledUrl = DATABASE_URL.replace('-pooler', '');
const sql         = neon(unpooledUrl);

// ─── Counters ─────────────────────────────────────────────────────────────────

const summary = {
  legacy:     { deleted: 0 },
  categories: { imported: 0, updated: 0, failed: 0 },
  products:   { imported: 0, updated: 0, skipped: 0, failed: 0 },
  variants:   { imported: 0, updated: 0, skipped: 0, failed: 0 },
  inventory:  { imported: 0, skipped: 0, failed: 0 },
};

const skippedRows: Array<{ sku: string; reason: string }> = [];
const failedRows:  Array<{ sku: string; reason: string }> = [];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

/**
 * Build a display name that includes variant size when it adds new information.
 * "Plywood" + "4mm" → "Plywood (4mm)"
 * "MCB Single Pole 6A" + "6A" → "MCB Single Pole 6A"   (size already in name)
 * "Pillar Cock" + "NA" → "Pillar Cock"                  (NA means no meaningful size)
 */
function buildDisplayName(productName: string, variantSize: string): string {
  const size = (variantSize ?? '').trim();
  if (!size || size.toUpperCase() === 'NA') return productName.trim();

  // Compare after stripping non-alphanumeric chars; skip if size ≥ 2 chars
  // and is already present in the product name.
  const normName = productName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const normSize = size.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (normSize.length >= 2 && normName.includes(normSize)) return productName.trim();

  return `${productName.trim()} (${size})`;
}

// ─── Live data fetch (optional) ──────────────────────────────────────────────

async function fetchLiveData(): Promise<CatalogueRow[]> {
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
  if (!apiKey) return CATALOGUE_ROWS;

  console.log('GOOGLE_SHEETS_API_KEY set — fetching live sheet data...');

  const TAB_SLUGS: Record<string, { slug: string; name: string }> = {
    '1. Carpentry – Boards': { slug: 'carpentry',           name: 'Carpentry'            },
    '2. Carpentry Hardware': { slug: 'carpentry',           name: 'Carpentry'            },
    '3. Paints':             { slug: 'paints',              name: 'Paints & Polish'      },
    '4. Plumbing':           { slug: 'plumbing',            name: 'Plumbing'             },
    '5. Civil Materials':    { slug: 'civil-materials',     name: 'Civil Materials'      },
    '6. Electrical':         { slug: 'electrical',          name: 'Electrical'           },
    '7. Flooring & Ceilings':{ slug: 'flooring-ceilings',   name: 'Flooring & Ceilings'  },
    '8. Glass & Aluminium':  { slug: 'glass-aluminium',     name: 'Glass & Aluminium'    },
    '9. Tools & Machines':   { slug: 'tools-machines',      name: 'Tools & Machines'     },
  };

  const rows: CatalogueRow[] = [];

  for (const [tabName, meta] of Object.entries(TAB_SLUGS)) {
    const encodedTab = encodeURIComponent(tabName);
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodedTab}!A2:M?key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`  Warning: could not fetch tab "${tabName}" (${res.status}), using embedded data.`);
      continue;
    }
    const json = (await res.json()) as { values?: string[][] };
    for (const row of json.values ?? []) {
      const [_sr, productName, brand, sku, description, variantSize, colourFinish, uom, mrpStr, fpStr, moqStr, imageUrl, remarks] = row;
      if (!sku?.trim() || !productName?.trim()) continue;
      rows.push({
        categorySlug:        meta.slug,
        categoryName:        meta.name,
        productName:         productName.trim(),
        brand:               brand?.trim()        ?? '',
        sku:                 sku.trim(),
        description:         description?.trim()  ?? '',
        variantSize:         variantSize?.trim()  ?? '',
        colourFinish:        colourFinish?.trim() ?? '',
        uom:                 uom?.trim()          ?? '',
        mrpRupees:           parseFloat(mrpStr)   || 0,
        fastgetPriceRupees:  parseFloat(fpStr)    || 0,
        moq:                 parseInt(moqStr, 10) || 1,
        imageUrl:            imageUrl?.trim()     ?? '',
        remarks:             remarks?.trim()      ?? '',
      });
    }
  }

  console.log(`  Fetched ${rows.length} rows from live sheet.`);
  return rows.length > 0 ? rows : CATALOGUE_ROWS;
}

// ─── Phase 0: Remove legacy grouped products ──────────────────────────────────
//
// Products created by the old import had no product_code (NULL).
// These are safe to delete — their variants/inventory cascade-delete, and
// orders store item data as JSONB (no FK to products).

async function cleanupLegacyProducts() {
  if (SKIP_CLEANUP) {
    console.log('\nPhase 0: Skipped (SKIP_CLEANUP=1).');
    return;
  }

  const countRows = await sql`SELECT COUNT(*) AS c FROM products WHERE product_code IS NULL`;
  const count = Number((countRows[0] as any).c);

  if (count === 0) {
    console.log('\nPhase 0: No legacy products to clean up.');
    return;
  }

  console.log(`\nPhase 0: Removing ${count} legacy products (no product_code)...`);
  console.log('  (variants and inventory will cascade-delete)');

  if (!DRY_RUN) {
    await sql`DELETE FROM products WHERE product_code IS NULL`;
    summary.legacy.deleted = count;
    console.log(`  Done — ${count} products deleted.`);
  } else {
    console.log(`  [DRY] Would delete ${count} legacy products.`);
  }
}

// ─── Phase 1: Upsert categories ───────────────────────────────────────────────

async function upsertCategories(rows: CatalogueRow[]): Promise<Map<string, string>> {
  const uniqueCategories = new Map<string, string>(); // slug → name
  for (const row of rows) {
    uniqueCategories.set(row.categorySlug, row.categoryName);
  }

  console.log(`\nPhase 1: Upserting ${uniqueCategories.size} categories...`);

  const slugToId = new Map<string, string>();

  for (const [slug, name] of Array.from(uniqueCategories)) {
    try {
      if (DRY_RUN) {
        console.log(`  [DRY] UPSERT category: ${name} (${slug})`);
        slugToId.set(slug, `dry-run-${slug}`);
        summary.categories.imported++;
        continue;
      }

      const result = await sql`
        INSERT INTO categories (name, slug)
        VALUES (${name}, ${slug})
        ON CONFLICT (slug) DO UPDATE
          SET name = EXCLUDED.name
        RETURNING id, (xmax = 0) AS inserted
      `;

      const r = result[0] as any;
      slugToId.set(slug, r.id);
      if (r.inserted) {
        summary.categories.imported++;
        console.log(`  + ${name}`);
      } else {
        summary.categories.updated++;
        console.log(`  ~ ${name} (exists)`);
      }
    } catch (err: any) {
      summary.categories.failed++;
      console.error(`  ERROR category ${slug}: ${err.message}`);
    }
  }

  return slugToId;
}

// ─── Phase 2: Upsert products (1 row = 1 product, keyed on product_code) ─────

async function upsertProducts(
  rows: CatalogueRow[],
  slugToId: Map<string, string>,
): Promise<Map<string, string>> {
  console.log(`\nPhase 2: Upserting ${rows.length} products (1 per Product Code)...`);

  const codeToProductId = new Map<string, string>(); // product_code → product UUID

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);

    for (const row of batch) {
      // ── Validate Product Code ───────────────────────────────────────────
      const productCode = (row.sku ?? '').trim();

      if (!productCode) {
        summary.products.skipped++;
        const reason = 'empty product code';
        skippedRows.push({ sku: '(empty)', reason });
        console.warn(`  SKIP row ${i}: ${reason} — "${row.productName}"`);
        continue;
      }

      const categoryId = slugToId.get(row.categorySlug) ?? null;
      if (!categoryId) {
        summary.products.skipped++;
        const reason = `unknown category slug "${row.categorySlug}"`;
        skippedRows.push({ sku: productCode, reason });
        console.warn(`  SKIP ${productCode}: ${reason}`);
        continue;
      }

      const displayName = buildDisplayName(row.productName, row.variantSize);
      const price       = toPaise(row.fastgetPriceRupees);
      const description = row.description?.trim() || null;
      const imageUrl    = row.imageUrl?.trim()     || null;

      try {
        if (DRY_RUN) {
          console.log(`  [DRY] UPSERT product: [${productCode}] ${row.brand} ${displayName}`);
          codeToProductId.set(productCode, `dry-run-${productCode}`);
          summary.products.imported++;
          continue;
        }

        const result = await sql`
          INSERT INTO products (name, brand, description, image_url, category_id, price, status, product_code)
          VALUES (
            ${displayName},
            ${row.brand  || null},
            ${description},
            ${imageUrl},
            ${categoryId},
            ${price},
            'active',
            ${productCode}
          )
          ON CONFLICT (product_code)
          WHERE product_code IS NOT NULL
          DO UPDATE SET
            name        = EXCLUDED.name,
            brand       = EXCLUDED.brand,
            description = EXCLUDED.description,
            image_url   = EXCLUDED.image_url,
            category_id = EXCLUDED.category_id,
            price       = EXCLUDED.price,
            status      = 'active',
            updated_at  = CURRENT_TIMESTAMP
          RETURNING id, (xmax = 0) AS inserted
        `;

        const r = result[0] as any;
        codeToProductId.set(productCode, r.id);

        if (r.inserted) {
          summary.products.imported++;
        } else {
          summary.products.updated++;
        }
      } catch (err: any) {
        summary.products.failed++;
        const reason = err.message ?? String(err);
        failedRows.push({ sku: productCode, reason });
        console.error(`  ERROR product [${productCode}] "${displayName}": ${reason}`);
      }
    }
  }

  console.log(
    `  Done. ${summary.products.imported} new | ` +
    `${summary.products.updated} updated | ` +
    `${summary.products.skipped} skipped | ` +
    `${summary.products.failed} failed`,
  );
  return codeToProductId;
}

// ─── Phase 3: Upsert variants (1 variant per product) ─────────────────────────

async function upsertVariants(
  rows: CatalogueRow[],
  codeToProductId: Map<string, string>,
): Promise<Map<string, string>> {
  console.log(`\nPhase 3: Upserting ${rows.length} variants...`);

  const skuToVariantId = new Map<string, string>();

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);

    for (const row of batch) {
      const sku        = (row.sku ?? '').trim();
      const productId  = codeToProductId.get(sku);

      if (!sku) {
        summary.variants.skipped++;
        continue;
      }

      if (!productId) {
        summary.variants.skipped++;
        console.warn(`  SKIP variant ${sku}: parent product not in codeToProductId map`);
        continue;
      }

      const attributes: Record<string, string> = {};
      if (row.variantSize  && row.variantSize  !== 'NA') attributes.size    = row.variantSize;
      if (row.colourFinish && row.colourFinish !== 'NA') attributes.colour  = row.colourFinish;
      if (row.uom)                                       attributes.uom     = row.uom;
      if (row.remarks)                                   attributes.remarks = row.remarks;

      const priceOverride = toPaise(row.fastgetPriceRupees);
      const mrpPrice      = toPaise(row.mrpRupees);

      try {
        if (DRY_RUN) {
          console.log(`  [DRY] UPSERT variant: ${sku}`);
          skuToVariantId.set(sku, `dry-run-${sku}`);
          summary.variants.imported++;
          continue;
        }

        const result = await sql`
          INSERT INTO product_variants
            (product_id, sku, price_override, mrp_price, moq, stock_quantity, attributes)
          VALUES
            (${productId}, ${sku}, ${priceOverride}, ${mrpPrice}, ${row.moq}, 0, ${JSON.stringify(attributes)})
          ON CONFLICT (sku) DO UPDATE
            SET product_id     = EXCLUDED.product_id,
                price_override = EXCLUDED.price_override,
                mrp_price      = EXCLUDED.mrp_price,
                moq            = EXCLUDED.moq,
                attributes     = EXCLUDED.attributes
          RETURNING id, (xmax = 0) AS inserted
        `;

        const r = result[0] as any;
        skuToVariantId.set(sku, r.id);

        if (r.inserted) {
          summary.variants.imported++;
        } else {
          summary.variants.updated++;
        }
      } catch (err: any) {
        summary.variants.failed++;
        const reason = err.message ?? String(err);
        failedRows.push({ sku, reason: `variant: ${reason}` });
        console.error(`  ERROR variant ${sku}: ${reason}`);
      }
    }
  }

  console.log(
    `  Done. ${summary.variants.imported} new | ` +
    `${summary.variants.updated} updated | ` +
    `${summary.variants.skipped} skipped | ` +
    `${summary.variants.failed} failed`,
  );
  return skuToVariantId;
}

// ─── Phase 4: Upsert inventory ────────────────────────────────────────────────

async function upsertInventory(skuToVariantId: Map<string, string>) {
  const entries = Array.from(skuToVariantId.entries()).filter(([, id]) => !id.startsWith('dry-run'));
  console.log(`\nPhase 4: Upserting inventory for ${entries.length} variants...`);

  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);

    for (const [_sku, variantId] of batch) {
      try {
        if (DRY_RUN) { summary.inventory.imported++; continue; }

        const result = await sql`
          INSERT INTO inventory (variant_id, stock_quantity, reorder_threshold)
          VALUES (${variantId}, 0, 5)
          ON CONFLICT (variant_id) DO NOTHING
          RETURNING id
        `;

        if (result.length > 0) {
          summary.inventory.imported++;
        } else {
          summary.inventory.skipped++;
        }
      } catch (err: any) {
        summary.inventory.failed++;
        console.error(`  ERROR inventory for variant ${variantId}: ${err.message}`);
      }
    }
  }

  console.log(
    `  Done. ${summary.inventory.imported} new | ` +
    `${summary.inventory.skipped} already existed | ` +
    `${summary.inventory.failed} failed`,
  );
}

// ─── Mismatch report ──────────────────────────────────────────────────────────

async function generateMismatchReport(rows: CatalogueRow[]) {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  Mismatch Report');
  console.log('═══════════════════════════════════════════════════');

  const sheetCount = rows.length;
  const sheetCodes = new Set(rows.map(r => r.sku.trim()).filter(Boolean));

  let dbCount  = 0;
  let dbCodes: Set<string> = new Set();

  if (!DRY_RUN) {
    const dbRows = await sql`SELECT product_code FROM products WHERE product_code IS NOT NULL`;
    dbCount = (dbRows as any[]).length;
    dbCodes = new Set((dbRows as any[]).map((r: any) => r.product_code as string));
  }

  const missingInDb  = Array.from(sheetCodes).filter(c => !dbCodes.has(c));
  const extraInDb    = Array.from(dbCodes).filter(c => !sheetCodes.has(c));

  console.log(`  Sheet rows (total)  : ${sheetCount}`);
  console.log(`  Sheet Product Codes : ${sheetCodes.size}`);
  if (!DRY_RUN) {
    console.log(`  DB products (coded) : ${dbCount}`);
    console.log(`  Difference          : ${sheetCodes.size - dbCount}`);

    if (missingInDb.length > 0) {
      console.log(`\n  ⚠  Missing from DB (${missingInDb.length}):`);
      missingInDb.forEach(c => console.log(`      - ${c}`));
    } else {
      console.log('\n  ✓  All Product Codes are present in DB');
    }

    if (extraInDb.length > 0) {
      console.log(`\n  Extra in DB not in sheet (${extraInDb.length}):`);
      extraInDb.forEach(c => console.log(`      - ${c}`));
    }
  }

  if (skippedRows.length > 0) {
    console.log(`\n  Skipped rows (${skippedRows.length}):`);
    skippedRows.forEach(r => console.log(`      - ${r.sku}: ${r.reason}`));
  }

  if (failedRows.length > 0) {
    console.log(`\n  Failed rows (${failedRows.length}):`);
    failedRows.forEach(r => console.log(`      - ${r.sku}: ${r.reason}`));
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  FastGet Catalogue Import  (Product Code = key)');
  if (DRY_RUN)      console.log('  MODE: DRY RUN — no writes to database');
  if (SKIP_CLEANUP) console.log('  SKIP_CLEANUP=1 — legacy cleanup skipped');
  console.log('═══════════════════════════════════════════════════');

  const rows = await fetchLiveData();
  console.log(`\nLoaded ${rows.length} catalogue rows.`);

  await cleanupLegacyProducts();

  const slugToId        = await upsertCategories(rows);
  const codeToProductId = await upsertProducts(rows, slugToId);
  const skuToVariantId  = await upsertVariants(rows, codeToProductId);
  await upsertInventory(skuToVariantId);

  console.log('\n═══════════════════════════════════════════════════');
  console.log('  Import Summary');
  console.log('═══════════════════════════════════════════════════');
  if (summary.legacy.deleted > 0) {
    console.log(`  Legacy cleanup : ${summary.legacy.deleted} old products removed`);
  }
  console.log(`  Categories : ${summary.categories.imported} new | ${summary.categories.updated} updated | ${summary.categories.failed} failed`);
  console.log(`  Products   : ${summary.products.imported} new | ${summary.products.updated} updated | ${summary.products.skipped} skipped | ${summary.products.failed} failed`);
  console.log(`  Variants   : ${summary.variants.imported} new | ${summary.variants.updated} updated | ${summary.variants.skipped} skipped | ${summary.variants.failed} failed`);
  console.log(`  Inventory  : ${summary.inventory.imported} new | ${summary.inventory.skipped} skipped | ${summary.inventory.failed} failed`);

  await generateMismatchReport(rows);

  console.log('\n═══════════════════════════════════════════════════\n');

  const totalFailed =
    summary.categories.failed +
    summary.products.failed +
    summary.variants.failed +
    summary.inventory.failed;

  if (totalFailed > 0) {
    console.error(`Finished with ${totalFailed} error(s).`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
