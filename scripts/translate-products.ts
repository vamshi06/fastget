#!/usr/bin/env tsx
/**
 * translate-products.ts
 * Machine-translates catalog product names (and descriptions) into Hindi and
 * stores them in product_translations with reviewed = FALSE, so admins can
 * check them later from the product edit page.
 *
 * Only products with no Hindi translation yet are sent. Rows an admin has
 * reviewed are never overwritten.
 *
 * Usage:
 *   npm run translate-products                 # translate everything missing
 *   npm run translate-products -- --dry-run    # print translations, write nothing
 *   npm run translate-products -- --limit 20   # only the first 20 products
 *   npm run translate-products -- --refresh    # also redo unreviewed translations
 *   npm run import-translations                # load scripts/data/product-translations-hi.json,
 *                                              # no API call (works the same in PowerShell)
 *
 * Translating needs ANTHROPIC_API_KEY (or an `ant auth login` profile). Every
 * mode needs DATABASE_URL / fastget_DATABASE_URL and migration 021 applied.
 *
 * Import file: JSON array of { product_code, name, description? } — extra keys
 * (e.g. en_name) are ignored. A blank description keeps any existing one.
 */

import * as fs from 'fs';

import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { neon } from '@neondatabase/serverless';
import { z } from 'zod/v4'; // the SDK's output-format helper takes zod v4 schemas

const DATABASE_URL = process.env.DATABASE_URL || process.env.fastget_DATABASE_URL;
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL or fastget_DATABASE_URL env var is required.');
  process.exit(1);
}
const sql = neon(DATABASE_URL.replace('-pooler', ''));

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const REFRESH = args.includes('--refresh');
const limitIdx = args.indexOf('--limit');
const LIMIT = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : undefined;
// `--import <file>`, or just a .json path: PowerShell drops the `--` in
// `npm run x -- --import f`, so npm swallows `--import` and only the path arrives.
const importIdx = args.indexOf('--import');
const IMPORT_FILE = importIdx >= 0
  ? args[importIdx + 1]
  : args.find((a) => a.toLowerCase().endsWith('.json'));

const KNOWN_FLAGS = new Set(['--dry-run', '--refresh', '--limit', '--import']);
const stray = args.filter((a, i) =>
  a.startsWith('--') ? !KNOWN_FLAGS.has(a) : !(args[i - 1] === '--limit' || a === IMPORT_FILE));
if (stray.length) {
  console.error(`ERROR: unrecognised argument(s): ${stray.join(' ')}`);
  process.exit(1);
}

const BATCH_SIZE = 25;
const MODEL = 'claude-opus-5';

const SYSTEM_PROMPT = `You translate product listings for FastGet, a construction and hardware materials delivery app in India, from English into Hindi. The shoppers are contractors, carpenters, plumbers, electricians and homeowners.

Write the Hindi that people in the trade actually say in shops, not formal or Sanskritised Hindi. Where the common spoken word is an English loanword, write that loanword in Devanagari (पाइप, प्लाई, टाइल, स्विच, वायर, सीमेंट, पुट्टी, ड्रिल) rather than inventing a pure-Hindi term nobody uses.

Keep these exactly as they appear in English, in Latin script:
- brand names (Asian Paints, CenturyPly, Astral, Havells, Bosch …). If the English name starts with the brand, the Hindi name must start with that same brand text, unchanged, followed by a space.
- model numbers, grades and codes (e.g. BWP, IS 710, 43 Grade, CPVC SDR 11)
- sizes, measurements and units (e.g. 1", 20mm, 8x4 ft, 1L, 50 kg)

Translate the description too when one is given, following the same rules. Return an empty string for description when the input has none.

Return exactly one entry per input product, with its product_code copied unchanged.`;

const TranslationBatch = z.object({
  translations: z.array(
    z.object({
      product_code: z.string(),
      name: z.string(),
      description: z.string(),
    }),
  ),
});

interface ProductRow {
  product_code: string;
  name: string;
  brand: string | null;
  description: string | null;
  category_slug: string | null;
}

interface Translation {
  product_code: string;
  name: string;
  description: string;
}

/**
 * Upsert unreviewed translations. Rows an admin has reviewed are left alone,
 * and a blank description keeps whatever description is already stored.
 */
async function saveTranslations(translations: Translation[]) {
  await sql.query(
    `INSERT INTO product_translations (product_code, locale, name, description, reviewed)
     SELECT code, 'hi', name, NULLIF(descr, ''), FALSE
       FROM unnest($1::text[], $2::text[], $3::text[]) AS x(code, name, descr)
     ON CONFLICT (product_code, locale) DO UPDATE
       SET name = EXCLUDED.name,
           description = COALESCE(EXCLUDED.description, product_translations.description),
           updated_at = NOW()
       WHERE product_translations.reviewed = FALSE`,
    [
      translations.map((t) => t.product_code),
      translations.map((t) => t.name.trim()),
      translations.map((t) => t.description.trim()),
    ],
  );
}

async function importFile(file: string) {
  const entries = JSON.parse(fs.readFileSync(file, 'utf8')) as Partial<Translation>[];
  const known = new Set(
    ((await sql.query('SELECT product_code FROM products_catalog_view')) as { product_code: string }[])
      .map((r) => r.product_code),
  );

  const valid: Translation[] = [];
  const unknown: string[] = [];
  for (const e of entries) {
    if (!e.product_code || !e.name?.trim()) continue;
    if (!known.has(e.product_code)) { unknown.push(e.product_code); continue; }
    valid.push({ product_code: e.product_code, name: e.name, description: e.description ?? '' });
  }

  if (unknown.length) console.warn(`Skipping ${unknown.length} code(s) not in the catalog: ${unknown.join(', ')}`);
  if (DRY_RUN) {
    console.log(`Dry run: would import ${valid.length} translation(s) from ${file}.`);
    return;
  }
  for (let i = 0; i < valid.length; i += 100) {
    await saveTranslations(valid.slice(i, i + 100));
  }
  console.log(`Imported ${valid.length} translation(s) from ${file} (reviewed rows left unchanged).`);
}

let client: Anthropic | undefined;

async function translateBatch(batch: ProductRow[]) {
  client ??= new Anthropic();
  const input = batch.map((p) => ({
    product_code: p.product_code,
    name: p.name,
    brand: p.brand ?? '',
    category: p.category_slug ?? '',
    description: p.description ?? '',
  }));

  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    output_config: { effort: 'medium', format: betaZodOutputFormat(TranslationBatch) },
    // Server-side fallback: if the model declines, the API retries on a fallback model
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: JSON.stringify(input, null, 2) }],
  });

  if (response.stop_reason === 'refusal') {
    throw new Error(`model declined this batch (${response.stop_details?.category ?? 'no category'})`);
  }
  if (response.stop_reason === 'max_tokens') {
    throw new Error('response hit max_tokens — lower BATCH_SIZE');
  }
  if (!response.parsed_output) {
    throw new Error('response did not match the expected JSON shape');
  }

  // Ignore anything the model returned for codes we didn't send
  const sent = new Set(batch.map((p) => p.product_code));
  return response.parsed_output.translations.filter(
    (t) => sent.has(t.product_code) && t.name.trim() !== '',
  );
}

async function main() {
  if (IMPORT_FILE) return importFile(IMPORT_FILE);

  const rows = (await sql.query(
    `SELECT cv.product_code, cv.name, cv.brand, cv.description, cv.category_slug
       FROM products_catalog_view cv
       LEFT JOIN product_translations t
         ON t.product_code = cv.product_code AND t.locale = 'hi'
      WHERE ${REFRESH ? 't.reviewed IS NOT TRUE' : 't.product_code IS NULL'}
      ORDER BY cv.product_code
      ${LIMIT ? `LIMIT ${LIMIT}` : ''}`,
  )) as ProductRow[];

  if (rows.length === 0) {
    console.log('Nothing to translate — every product already has a Hindi name.');
    return;
  }
  console.log(`Translating ${rows.length} product(s) with ${MODEL}${DRY_RUN ? ' (dry run)' : ''}\n`);

  let saved = 0;
  let failedBatches = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const label = `batch ${i / BATCH_SIZE + 1}/${Math.ceil(rows.length / BATCH_SIZE)}`;
    try {
      const translations = await translateBatch(batch);

      if (DRY_RUN) {
        const english = new Map(batch.map((p) => [p.product_code, p.name]));
        for (const t of translations) {
          console.log(`  ${t.product_code}: ${english.get(t.product_code)}  →  ${t.name}`);
        }
      } else if (translations.length > 0) {
        await saveTranslations(translations);
      }

      saved += translations.length;
      const missing = batch.length - translations.length;
      console.log(`${label}: ${translations.length} translated${missing ? `, ${missing} skipped` : ''}`);
    } catch (error) {
      failedBatches++;
      // No key at all fails before the request with a plain Error, not AuthenticationError
      const noCredentials = error instanceof Error && /authentication method/i.test(error.message);
      if (error instanceof Anthropic.AuthenticationError || noCredentials) {
        console.error(
          'ERROR: Anthropic credentials missing or invalid — set ANTHROPIC_API_KEY in .env.local.\n' +
          'To load the prepared translations instead (no key needed): npm run import-translations',
        );
        process.exit(1);
      } else if (error instanceof Anthropic.APIError) {
        console.error(`${label}: API error ${error.status}: ${error.message}`);
      } else {
        console.error(`${label}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  console.log(
    `\nDone. ${saved} translation(s) ${DRY_RUN ? 'generated' : 'saved'}` +
      (failedBatches ? `, ${failedBatches} batch(es) failed — re-run to retry them.` : '.'),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
