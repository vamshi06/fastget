#!/usr/bin/env node
import {
  initializeDatabase,
  initializeUsersTable,
  initializeUserAddressesTable,
  initializeCategoriesTable,
  initializeProductsTable,
  initializeProductVariantsTable,
  initializeWishlistsTable,
  addUserIdToOrders,
  initializeAllTables,
} from '../src/lib/db.ts';

console.log('=== FastGet Database Initialization ===\n');

try {
  console.log('🔗 Connecting to Neon Postgres...');
  console.log(`📍 Database URL: ${process.env.fastget_DATABASE_URL?.substring(0, 50)}...\n`);

  console.log('📦 Initializing all tables (Phase 1, Phase 2, Phase 4)...\n');
  await initializeAllTables();

  console.log('\n✅ Database initialization completed successfully!');
  console.log('📊 Tables created:');
  console.log('   ✓ orders (with user_id support)');
  console.log('   ✓ users');
  console.log('   ✓ user_addresses');
  console.log('   ✓ categories');
  console.log('   ✓ products');
  console.log('   ✓ product_variants');
  console.log('   ✓ wishlists');
  console.log('\n📑 Next steps:');
  console.log('   1. Test the database connection with test-neon.mjs');
  console.log('   2. Verify all indexes were created (check pg_indexes)');
  console.log('   3. Run integration tests to verify data integrity');

  process.exit(0);
} catch (error) {
  console.error('❌ Failed to initialize database:', error);
  console.error('\n⚠️  Troubleshooting:');
  console.error('   - Check DATABASE_URL or fastget_DATABASE_URL is set');
  console.error('   - Verify Neon connection credentials are valid');
  console.error('   - Ensure you have permission to create tables');
  process.exit(1);
}
