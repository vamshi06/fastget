#!/usr/bin/env node
/**
 * Place a test order in the database (persists - doesn't clean up)
 * 
 * Usage:
 *   node scripts/place-test-order.mjs
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
    // .env.local doesn't exist
  }
}

if (!databaseUrl) {
  console.error('❌ DATABASE_URL not found. Run: vercel env pull .env.local');
  process.exit(1);
}

const sql = neon(databaseUrl);

async function placeTestOrder() {
  try {
    console.log('🛒 Placing test order...\n');
    
    const orderId = 'order-' + Date.now();
    const statusToken = 'track-' + Math.random().toString(36).substring(2, 10);
    const updateToken = 'agent-' + Math.random().toString(36).substring(2, 10);
    
    await sql`
      INSERT INTO orders (
        id, created_at, customer_name, customer_phone, site_address, landmark,
        delivery_type, scheduled_time, items, subtotal, convenience_fee, total,
        payment_method, status, eta, status_token, update_token
      ) VALUES (
        ${orderId}, 
        NOW(),
        'Test Customer (Manual)', 
        '+91-98765-43210', 
        '456 Test Site Address, Andheri East, Mumbai',
        'Near Metro Station',
        'urgent',
        NULL,
        ${JSON.stringify([
          { sku: 'ply-8x4-12mm', name: 'Plywood Board 8x4 ft - 12mm', quantity: 5, price: 850 },
          { sku: 'cement-ppc', name: 'Portland Pozzolana Cement 50kg', quantity: 10, price: 320 }
        ])},
        7450,
        50,
        7500,
        'cod',
        'received',
        NULL,
        ${statusToken},
        ${updateToken}
      )
    `;
    
    console.log('✅ Test order placed successfully!\n');
    console.log('Order Details:');
    console.log(`  Order ID: ${orderId}`);
    console.log(`  Customer: Test Customer (Manual)`);
    console.log(`  Phone: +91-98765-43210`);
    console.log(`  Total: ₹7,500`);
    console.log(`  Status: received`);
    console.log(`\nTracking URL:`);
    console.log(`  http://localhost:3000/order/${statusToken}`);
    console.log(`\nAgent Update URL:`);
    console.log(`  http://localhost:3000/agent/${updateToken}`);
    console.log(`\n💡 This order will persist in the database.`);
    
  } catch (error) {
    console.error('❌ Failed to place order:', error.message);
    process.exit(1);
  }
}

placeTestOrder();
