#!/usr/bin/env node

/**
 * Database State Verification Utility
 * 
 * This script helps troubleshoot connection pooling and caching issues by:
 * 1. Querying the database directly (bypassing any application caches)
 * 2. Using both pooled and unpooled connections to compare results
 * 3. Verifying transaction states
 * 4. Checking for stale connection issues
 * 
 * Usage:
 *   node scripts/verify-db-state.mjs [table] [id]
 *   node scripts/verify-db-state.mjs users <user-id>
 *   node scripts/verify-db-state.mjs orders <order-id>
 *   node scripts/verify-db-state.mjs --check-all
 */

import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables from .env.local
function loadEnv() {
  try {
    const envPath = join(process.cwd(), '.env.local');
    const envContent = readFileSync(envPath, 'utf-8');
    
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          process.env[key.trim()] = value;
        }
      }
    });
  } catch (error) {
    console.warn('Warning: Could not load .env.local file');
  }
}

loadEnv();

const databaseUrl = process.env.DATABASE_URL || process.env.fastget_DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL not found in environment');
  process.exit(1);
}

// Create both pooled and unpooled connections
const pooledUrl = databaseUrl;
const unpooledUrl = databaseUrl.replace('-pooler', '');

const pooledSql = neon(pooledUrl);
const unpooledSql = neon(unpooledUrl);

/**
 * Verify a specific record exists in the database
 */
async function verifyRecord(table, id) {
  console.log(`\n🔍 Verifying ${table} record: ${id}\n`);
  console.log('=' .repeat(60));

  try {
    // Query using pooled connection
    console.log('\n📊 Querying via POOLED connection...');
    const pooledResult = await pooledSql`
      SELECT * FROM ${pooledSql(table)} WHERE id = ${id}
    `;
    console.log(`   Found ${pooledResult.length} record(s)`);
    if (pooledResult.length > 0) {
      console.log('   ✓ Record exists in pooled connection');
      console.log('   Data:', JSON.stringify(pooledResult[0], null, 2));
    } else {
      console.log('   ✗ Record NOT found in pooled connection');
    }

    // Query using unpooled connection (direct to primary)
    console.log('\n📊 Querying via UNPOOLED connection (direct primary)...');
    const unpooledResult = await unpooledSql`
      SELECT * FROM ${unpooledSql(table)} WHERE id = ${id}
    `;
    console.log(`   Found ${unpooledResult.length} record(s)`);
    if (unpooledResult.length > 0) {
      console.log('   ✓ Record exists in unpooled connection');
      console.log('   Data:', JSON.stringify(unpooledResult[0], null, 2));
    } else {
      console.log('   ✗ Record NOT found in unpooled connection');
    }

    // Compare results
    console.log('\n🔄 Comparison:');
    if (pooledResult.length !== unpooledResult.length) {
      console.log('   ⚠️  MISMATCH DETECTED!');
      console.log(`   Pooled: ${pooledResult.length} records`);
      console.log(`   Unpooled: ${unpooledResult.length} records`);
      console.log('\n   💡 This indicates a connection pooling issue.');
      console.log('   The pooled connection has stale data.');
      console.log('\n   Recommended actions:');
      console.log('   1. Restart your application to refresh connections');
      console.log('   2. Use unpooled connections for critical reads');
      console.log('   3. Implement connection refresh logic');
    } else if (pooledResult.length === 0) {
      console.log('   ✓ Both connections agree: Record does NOT exist');
      console.log('\n   💡 The record was successfully deleted from the database.');
    } else {
      console.log('   ✓ Both connections agree: Record exists');
      console.log('\n   💡 No connection pooling issues detected.');
    }

  } catch (error) {
    console.error('\n❌ Error verifying record:', error.message);
    console.error('Stack:', error.stack);
  }

  console.log('\n' + '='.repeat(60));
}

/**
 * Check for uncommitted transactions
 */
async function checkTransactions() {
  console.log('\n🔍 Checking for uncommitted transactions...\n');
  console.log('=' .repeat(60));

  try {
    const result = await unpooledSql`
      SELECT 
        pid,
        usename,
        application_name,
        state,
        query_start,
        state_change,
        query
      FROM pg_stat_activity
      WHERE state IN ('idle in transaction', 'active')
        AND datname = current_database()
      ORDER BY query_start
    `;

    if (result.length === 0) {
      console.log('✓ No uncommitted transactions found');
    } else {
      console.log(`⚠️  Found ${result.length} active/uncommitted transaction(s):\n`);
      result.forEach((tx, i) => {
        console.log(`Transaction ${i + 1}:`);
        console.log(`  PID: ${tx.pid}`);
        console.log(`  User: ${tx.usename}`);
        console.log(`  App: ${tx.application_name}`);
        console.log(`  State: ${tx.state}`);
        console.log(`  Started: ${tx.query_start}`);
        console.log(`  Last Change: ${tx.state_change}`);
        console.log(`  Query: ${tx.query?.substring(0, 100)}...`);
        console.log('');
      });

      console.log('💡 Uncommitted transactions can cause data visibility issues.');
      console.log('   Ensure all transactions are properly committed or rolled back.');
    }
  } catch (error) {
    console.error('❌ Error checking transactions:', error.message);
  }

  console.log('='.repeat(60));
}

/**
 * Check connection pool statistics
 */
async function checkConnectionPool() {
  console.log('\n🔍 Checking connection pool statistics...\n');
  console.log('=' .repeat(60));

  try {
    const result = await unpooledSql`
      SELECT 
        COUNT(*) as total_connections,
        COUNT(*) FILTER (WHERE state = 'active') as active,
        COUNT(*) FILTER (WHERE state = 'idle') as idle,
        COUNT(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction
      FROM pg_stat_activity
      WHERE datname = current_database()
    `;

    const stats = result[0];
    console.log('Connection Statistics:');
    console.log(`  Total Connections: ${stats.total_connections}`);
    console.log(`  Active: ${stats.active}`);
    console.log(`  Idle: ${stats.idle}`);
    console.log(`  Idle in Transaction: ${stats.idle_in_transaction}`);

    if (parseInt(stats.idle_in_transaction) > 0) {
      console.log('\n⚠️  Warning: Idle transactions detected!');
      console.log('   These can hold locks and cause stale data issues.');
    }

  } catch (error) {
    console.error('❌ Error checking connection pool:', error.message);
  }

  console.log('='.repeat(60));
}

/**
 * Test connection freshness
 */
async function testConnectionFreshness() {
  console.log('\n🔍 Testing connection freshness...\n');
  console.log('=' .repeat(60));

  try {
    // Create a test record
    const testId = crypto.randomUUID();
    const testTable = 'users';
    
    console.log('1. Creating test record...');
    await unpooledSql`
      INSERT INTO ${unpooledSql(testTable)} (id, name, email, phone, role)
      VALUES (${testId}, 'Test User', ${`test-${testId}@example.com`}, '0000000000', 'customer')
    `;
    console.log('   ✓ Test record created');

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 100));

    // Query with pooled connection
    console.log('\n2. Querying with pooled connection...');
    const pooledResult = await pooledSql`
      SELECT * FROM ${pooledSql(testTable)} WHERE id = ${testId}
    `;
    console.log(`   Found ${pooledResult.length} record(s)`);

    // Delete the record
    console.log('\n3. Deleting test record...');
    await unpooledSql`
      DELETE FROM ${unpooledSql(testTable)} WHERE id = ${testId}
    `;
    console.log('   ✓ Test record deleted');

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 100));

    // Query again with pooled connection
    console.log('\n4. Querying again with pooled connection...');
    const pooledResult2 = await pooledSql`
      SELECT * FROM ${pooledSql(testTable)} WHERE id = ${testId}
    `;
    console.log(`   Found ${pooledResult2.length} record(s)`);

    // Verify with unpooled
    console.log('\n5. Verifying with unpooled connection...');
    const unpooledResult = await unpooledSql`
      SELECT * FROM ${unpooledSql(testTable)} WHERE id = ${testId}
    `;
    console.log(`   Found ${unpooledResult.length} record(s)`);

    // Analysis
    console.log('\n📊 Analysis:');
    if (pooledResult2.length > 0 && unpooledResult.length === 0) {
      console.log('   ⚠️  STALE CONNECTION DETECTED!');
      console.log('   The pooled connection is showing deleted data.');
      console.log('\n   💡 Recommended actions:');
      console.log('   1. Restart your application');
      console.log('   2. Use unpooled connections for critical operations');
      console.log('   3. Implement connection refresh mechanism');
    } else {
      console.log('   ✓ Connections are fresh and synchronized');
    }

  } catch (error) {
    console.error('❌ Error testing connection freshness:', error.message);
  }

  console.log('='.repeat(60));
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);

  console.log('\n🔧 Database State Verification Utility');
  console.log('=' .repeat(60));
  console.log(`Database: ${databaseUrl.split('@')[1]?.split('/')[0] || 'unknown'}`);
  console.log(`Pooled URL: ${pooledUrl.includes('-pooler') ? 'Yes' : 'No'}`);
  console.log(`Unpooled URL: ${unpooledUrl.includes('-pooler') ? 'No (direct)' : 'Yes'}`);

  if (args.length === 0 || args[0] === '--help') {
    console.log('\nUsage:');
    console.log('  node scripts/verify-db-state.mjs <table> <id>');
    console.log('  node scripts/verify-db-state.mjs --check-all');
    console.log('  node scripts/verify-db-state.mjs --test-freshness');
    console.log('  node scripts/verify-db-state.mjs --check-transactions');
    console.log('  node scripts/verify-db-state.mjs --check-pool');
    console.log('\nExamples:');
    console.log('  node scripts/verify-db-state.mjs users 123e4567-e89b-12d3-a456-426614174000');
    console.log('  node scripts/verify-db-state.mjs orders abc123');
    console.log('  node scripts/verify-db-state.mjs --check-all');
    return;
  }

  if (args[0] === '--check-all') {
    await checkConnectionPool();
    await checkTransactions();
    await testConnectionFreshness();
  } else if (args[0] === '--test-freshness') {
    await testConnectionFreshness();
  } else if (args[0] === '--check-transactions') {
    await checkTransactions();
  } else if (args[0] === '--check-pool') {
    await checkConnectionPool();
  } else if (args.length === 2) {
    const [table, id] = args;
    await verifyRecord(table, id);
  } else {
    console.log('\n❌ Invalid arguments. Use --help for usage information.');
  }

  console.log('\n✅ Verification complete\n');
}

main().catch(console.error);
