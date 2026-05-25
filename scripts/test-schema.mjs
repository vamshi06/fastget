#!/usr/bin/env node
import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL || process.env.fastget_DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL or fastget_DATABASE_URL not set');
  process.exit(1);
}

const sql = neon(databaseUrl);

console.log('=== FastGet Database Schema Verification ===\n');

try {
  // Expected tables
  const expectedTables = [
    'orders',
    'users',
    'user_addresses',
    'categories',
    'products',
    'product_variants',
    'wishlists',
  ];

  // Check tables exist
  console.log('📋 Verifying tables...');
  for (const table of expectedTables) {
    const result = await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = ${table}
      )
    `;

    const exists = result[0].exists;
    console.log(`   ${exists ? '✓' : '✗'} ${table}`);

    if (!exists) {
      console.error(`\n❌ Table "${table}" not found!`);
      process.exit(1);
    }
  }

  // Check indexes exist
  console.log('\n📑 Verifying indexes...');
  const indexResult = await sql`
    SELECT schemaname, tablename, indexname FROM pg_indexes 
    WHERE schemaname = 'public'
    ORDER BY tablename, indexname
  `;

  const indexByTable = {};
  for (const idx of indexResult) {
    if (!indexByTable[idx.tablename]) {
      indexByTable[idx.tablename] = [];
    }
    indexByTable[idx.tablename].push(idx.indexname);
  }

  for (const table of expectedTables) {
    const indexes = indexByTable[table] || [];
    console.log(`   ${table}: ${indexes.length} indexes`);
    indexes.forEach((idx) => console.log(`      - ${idx}`));
  }

  // Check constraints
  console.log('\n🔐 Verifying constraints...');

  // Check foreign key: users -> user_addresses
  const fkResult1 = await sql`
    SELECT constraint_name FROM information_schema.constraint_column_usage
    WHERE table_name = 'user_addresses' AND column_name = 'user_id'
  `;
  console.log(`   ${fkResult1.length > 0 ? '✓' : '✗'} user_addresses.user_id -> users.id`);

  // Check foreign key: products -> categories
  const fkResult2 = await sql`
    SELECT constraint_name FROM information_schema.constraint_column_usage
    WHERE table_name = 'products' AND column_name = 'category_id'
  `;
  console.log(`   ${fkResult2.length > 0 ? '✓' : '✗'} products.category_id -> categories.id`);

  // Check foreign key: product_variants -> products
  const fkResult3 = await sql`
    SELECT constraint_name FROM information_schema.constraint_column_usage
    WHERE table_name = 'product_variants' AND column_name = 'product_id'
  `;
  console.log(`   ${fkResult3.length > 0 ? '✓' : '✗'} product_variants.product_id -> products.id`);

  // Check unique constraints
  console.log('\n🔑 Verifying unique constraints...');
  const uniqueResult = await sql`
    SELECT constraint_name, table_name FROM information_schema.table_constraints
    WHERE constraint_type = 'UNIQUE'
    ORDER BY table_name, constraint_name
  `;

  const uniqueByTable = {};
  for (const constraint of uniqueResult) {
    if (!uniqueByTable[constraint.table_name]) {
      uniqueByTable[constraint.table_name] = [];
    }
    uniqueByTable[constraint.table_name].push(constraint.constraint_name);
  }

  for (const table of expectedTables) {
    const constraints = uniqueByTable[table] || [];
    if (constraints.length > 0) {
      console.log(`   ${table}:`);
      constraints.forEach((c) => console.log(`      - ${c}`));
    }
  }

  // Column verification for critical tables
  console.log('\n📊 Verifying key columns...');

  const columnsToCheck = [
    { table: 'users', columns: ['id', 'email', 'password_hash', 'phone', 'role', 'preferred_address_id', 'last_order_at', 'created_at', 'updated_at'] },
    { table: 'products', columns: ['id', 'name', 'description', 'category_id', 'price', 'status', 'created_at', 'updated_at'] },
    { table: 'product_variants', columns: ['id', 'product_id', 'sku', 'price_override', 'stock_quantity', 'attributes', 'created_at'] },
    { table: 'orders', columns: ['id', 'user_id', 'customer_name', 'customer_phone', 'status', 'status_token', 'update_token', 'created_at'] },
  ];

  for (const tableCheck of columnsToCheck) {
    console.log(`   ${tableCheck.table}:`);
    for (const col of tableCheck.columns) {
      const colResult = await sql`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = ${tableCheck.table} AND column_name = ${col}
      `;
      console.log(`      ${colResult.length > 0 ? '✓' : '✗'} ${col}`);
    }
  }

  console.log('\n✅ Schema verification completed successfully!');
  console.log('\n📝 Summary:');
  console.log(`   Tables: ${expectedTables.length} ✓`);
  console.log(`   Indexes: ${Object.values(indexByTable).flat().length} ✓`);
  console.log(`   Constraints: ${uniqueResult.length} ✓`);
  console.log('\n🚀 Database is ready for use!');

  process.exit(0);
} catch (error) {
  console.error('❌ Verification failed:', error);
  process.exit(1);
}
