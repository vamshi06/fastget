#!/usr/bin/env node
/**
 * Replaces /q_auto/f_auto/ with /e_background_removal/ in Cloudinary image_url
 * across all product catalog tables.
 *
 * Usage:
 *   node --env-file=.env.local scripts/fix-cloudinary-urls.mjs
 *
 * Add --dry-run to preview changes without writing to the database:
 *   node --env-file=.env.local scripts/fix-cloudinary-urls.mjs --dry-run
 */

import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL || process.env.fastget_DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL (or fastget_DATABASE_URL) is not set.');
  console.error('   Run with: node --env-file=.env.local scripts/fix-cloudinary-urls.mjs');
  process.exit(1);
}

const isDryRun = process.argv.includes('--dry-run');
const FROM = '/q_auto/f_auto/';
const TO = '/e_background_removal/';

// All tables that have an image_url column
const TABLES = [
  'products',
  'carpentry',
  'paints_and_polish',
  'plumbing',
  'civil_materials',
  'electrical',
  'flooring_and_ceilings',
  'glass_and_aluminium',
  'tools_and_machines',
];

const sql = neon(databaseUrl);

console.log(`\n=== Cloudinary URL Migration ===`);
console.log(`  Replace: ${FROM}`);
console.log(`  With:    ${TO}`);
if (isDryRun) console.log(`  Mode:    DRY RUN (no changes will be written)\n`);
else console.log(`  Mode:    LIVE (updating database)\n`);

let grandTotal = 0;

for (const table of TABLES) {
  // Check if the table exists before attempting to query it
  const [exists] = await sql`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ${table}
    ) AS ok
  `;

  if (!exists.ok) {
    console.log(`⚠️  Table "${table}" does not exist — skipping`);
    continue;
  }

  // Count affected rows
  const [{ count }] = await sql`
    SELECT COUNT(*) AS count FROM ${sql.unsafe(`"${table}"`)}
    WHERE image_url LIKE ${`%${FROM}%`}
  `;

  const affected = Number(count);

  if (affected === 0) {
    console.log(`✅ ${table.padEnd(25)} — no rows to update`);
    continue;
  }

  if (isDryRun) {
    // Show sample URLs so the user can verify the transformation looks right
    const samples = await sql`
      SELECT image_url FROM ${sql.unsafe(`"${table}"`)}
      WHERE image_url LIKE ${`%${FROM}%`}
      LIMIT 3
    `;

    console.log(`🔍 ${table.padEnd(25)} — ${affected} row(s) would be updated`);
    for (const { image_url: original } of samples) {
      const updated = original.replaceAll(FROM, TO);
      console.log(`     Before: ${original}`);
      console.log(`     After:  ${updated}`);
}
    if (affected > 3) console.log(`     ... and ${affected - 3} more`);
  } else {
    await sql`
      UPDATE ${sql.unsafe(`"${table}"`)}
      SET image_url = REPLACE(image_url, ${FROM}, ${TO})
      WHERE image_url LIKE ${`%${FROM}%`}
    `;

    console.log(`✅ ${table.padEnd(25)} — updated ${affected} row(s)`);
  }

  grandTotal += affected;
}

console.log(`\n${'─'.repeat(45)}`);
if (isDryRun) {
  console.log(`Total rows that WOULD be updated: ${grandTotal}`);
  console.log(`\nRe-run without --dry-run to apply changes.`);
} else {
  console.log(`Total rows updated: ${grandTotal}`);
  console.log(`\nDone.`);
}
