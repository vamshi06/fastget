#!/usr/bin/env tsx
/**
 * sync-schema.ts
 * Runs all pending SQL migrations against the Neon database.
 * Safe to run multiple times — all migrations use IF NOT EXISTS / IF EXISTS guards.
 *
 * Usage:  npm run sync-schema
 */

import { neon } from '@neondatabase/serverless';
import * as fs from 'fs';
import * as path from 'path';

const DATABASE_URL =
  process.env.DATABASE_URL ||
  process.env.fastget_DATABASE_URL;

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL or fastget_DATABASE_URL env var is required.');
  process.exit(1);
}

// Use unpooled connection for DDL statements
const unpooledUrl = DATABASE_URL.replace('-pooler', '');
const sql = neon(unpooledUrl);

const MIGRATIONS_DIR = path.join(__dirname, '..', 'db', 'migrations');

async function runMigrations() {
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('No migration files found in', MIGRATIONS_DIR);
    return;
  }

  console.log(`\nRunning ${files.length} migration(s) from ${MIGRATIONS_DIR}\n`);

  let passed = 0;
  let failed = 0;

  for (const file of files) {
    const filePath = path.join(MIGRATIONS_DIR, file);
    const migrationSql = fs.readFileSync(filePath, 'utf8');

    process.stdout.write(`  ${file} ... `);

    // Split on semicolons, run each non-empty statement individually so errors are isolated
    const statements = migrationSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.replace(/^--.*$/mg, '').trim().startsWith(''));

    // Rebuild clean statements (strip leading comment lines per statement)
    const cleanStatements = migrationSql
      .split(';')
      .map(s => s.replace(/^--[^\n]*\n/gm, '').trim())
      .filter(s => s.length > 0);

    let migrationFailed = false;
    for (const stmt of cleanStatements) {
      try {
        await sql.query(stmt);
      } catch (err: any) {
        console.log('FAILED');
        console.error(`    → ${err.message}`);
        migrationFailed = true;
        break;
      }
    }

    if (!migrationFailed) {
      console.log('OK');
      passed++;
    } else {
      failed++;
    }
  }

  console.log(`\nDone. ${passed} passed, ${failed} failed.\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runMigrations().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
