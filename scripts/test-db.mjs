#!/usr/bin/env node
/**
 * Simple database connectivity test
 * 
 * Usage:
 *   DATABASE_URL="postgresql://..." node scripts/test-db.mjs
 * 
 * Or pull env vars from Vercel first:
 *   vercel env pull .env.local
 *   node scripts/test-db.mjs
 */

import { readFileSync } from 'fs';
import { neon } from '@neondatabase/serverless';

// Try to read from .env.local if env vars not set
let databaseUrl = process.env.DATABASE_URL || process.env.fastget_DATABASE_URL;

if (!databaseUrl) {
  try {
    const envFile = readFileSync('.env.local', 'utf8');
    const envVars = {};
    envFile.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        envVars[match[1]] = match[2].replace(/^["']|["']$/g, '');
      }
    });
    databaseUrl = envVars.DATABASE_URL || envVars.fastget_DATABASE_URL;
  } catch (e) {
    // .env.local doesn't exist, that's okay
  }
}

console.log('=== Neon Database Connection Test ===\n');

// Check if DATABASE_URL is set
if (!databaseUrl) {
  console.error('❌ DATABASE_URL is not set in environment');
  console.error('');
  console.error('Checked for: DATABASE_URL, fastget_DATABASE_URL');
  console.error('');
  console.error('To fix:');
  console.error('  1. Pull env vars: vercel env pull .env.local');
  console.error('  2. Run test:      node scripts/test-db.mjs');
  console.error('');
  console.error('Or set it directly:');
  console.error('  DATABASE_URL="postgresql://..." node scripts/test-db.mjs');
  process.exit(1);
}

console.log('✓ DATABASE_URL is configured');
console.log(`   URL: ${databaseUrl.replace(/:([^:@]+)@/, ':***@').substring(0, 60)}...\n`);

const sql = neon(databaseUrl);

async function testConnection() {
  try {
    // Test 1: Basic connection
    console.log('Test 1: Testing basic connection...');
    const version = await sql`SELECT version()`;
    console.log('✓ Connected successfully');
    console.log(`   Server: ${version[0].version.split(' ')[0]}\n`);

    // Test 2: Check if orders table exists
    console.log('Test 2: Checking orders table...');
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'orders'
      )
    `;
    
    if (tableCheck[0].exists) {
      console.log('✓ Orders table exists');
      
      // Count existing orders
      const count = await sql`SELECT COUNT(*) FROM orders`;
      console.log(`   Existing orders: ${count[0].count}\n`);
    } else {
      console.log('⚠ Orders table does not exist');
      console.log('   Initialize it via your app or SQL.\n');
    }

    // Test 3: Create a test order
    console.log('Test 3: Creating test order...');
    const testOrderId = 'test-' + Date.now();
    const testStatusToken = 'st-' + Math.random().toString(36).substring(2, 15);
    const testUpdateToken = 'ut-' + Math.random().toString(36).substring(2, 15);
    
    await sql`
      INSERT INTO orders (
        id, created_at, customer_name, customer_phone, site_address, landmark,
        delivery_type, scheduled_time, items, subtotal, convenience_fee, total,
        payment_method, status, eta, status_token, update_token
      ) VALUES (
        ${testOrderId}, 
        NOW(),
        'Test Customer', 
        '+91-99999-99999', 
        '123 Test Street, Mumbai',
        'Near Test Landmark',
        'urgent',
        NULL,
        ${JSON.stringify([{ sku: 'test-sku', name: 'Test Product', quantity: 1, price: 100 }])},
        100,
        10,
        110,
        'cod',
        'received',
        NULL,
        ${testStatusToken},
        ${testUpdateToken}
      )
    `;
    
    console.log('✓ Test order created');
    console.log(`   Order ID: ${testOrderId}`);
    console.log(`   Status Token: ${testStatusToken}\n`);

    // Test 4: Retrieve the order
    console.log('Test 4: Retrieving test order...');
    const retrieved = await sql`
      SELECT id, customer_name, status, status_token, created_at 
      FROM orders 
      WHERE id = ${testOrderId}
    `;
    
    if (retrieved.length > 0) {
      console.log('✓ Order retrieved successfully');
      console.log(`   Customer: ${retrieved[0].customer_name}`);
      console.log(`   Status: ${retrieved[0].status}`);
      console.log(`   Created: ${retrieved[0].created_at}\n`);
    } else {
      console.log('❌ Failed to retrieve order\n');
    }

    // Test 5: Clean up test data
    console.log('Test 5: Cleaning up test data...');
    await sql`DELETE FROM orders WHERE id = ${testOrderId}`;
    console.log('✓ Test data cleaned up\n');

    console.log('=== All Tests Passed! ===');
    console.log('\nYour application can:');
    console.log('  ✓ Connect to Neon database');
    console.log('  ✓ Read from orders table');
    console.log('  ✓ Write to orders table');
    console.log('\nYou can now run: npm run dev');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.error('\n   Tip: Check your internet connection and DATABASE_URL');
    } else if (error.message.includes('does not exist')) {
      console.error('\n   Tip: The orders table needs to be created first');
      console.error('        It will be auto-created on first API call if you use initializeDatabase()');
    } else if (error.message.includes('28P01') || error.message.includes('authentication')) {
      console.error('\n   Tip: Check your DATABASE_URL password/credentials');
    } else if (error.message.includes('relation') && error.message.includes('orders')) {
      console.error('\n   Tip: Orders table does not exist.');
      console.error('        Run: npm run dev and hit an API endpoint to initialize it.');
    }
    
    process.exit(1);
  }
}

testConnection();
