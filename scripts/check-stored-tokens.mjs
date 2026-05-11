#!/usr/bin/env node
/**
 * Check what tokens are actually stored in the database
 */

import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.fastget_DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ fastget_DATABASE_URL not set');
  process.exit(1);
}

const sql = neon(databaseUrl);

async function checkStoredTokens() {
  try {
    console.log('\n📊 Checking tokens stored in database...\n');

    const result = await sql`
      SELECT 
        id,
        customer_name,
        status_token,
        update_token,
        length(status_token) as status_token_length,
        length(update_token) as update_token_length,
        created_at
      FROM orders
      ORDER BY created_at DESC
      LIMIT 5
    `;

    if (result.length === 0) {
      console.log('ℹ️  No orders found in database');
      process.exit(0);
    }

    console.log('📋 Last 5 Orders:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    result.forEach((order, index) => {
      console.log(`${index + 1}. ${order.customer_name}`);
      console.log(`   Order ID: ${order.id}`);
      console.log(`   Status Token: "${order.status_token}" (length: ${order.status_token_length})`);
      console.log(`   Update Token: "${order.update_token}" (length: ${order.update_token_length})`);
      console.log(`   Created: ${order.created_at}\n`);
    });

    // Check for any tokens that are NOT 16 characters
    const badTokens = result.filter(o => o.status_token_length !== 16 || o.update_token_length !== 16);
    
    if (badTokens.length > 0) {
      console.log('⚠️  WARNING: Found tokens that are not 16 characters!');
      badTokens.forEach(order => {
        if (order.status_token_length !== 16) {
          console.log(`   ❌ Order ${order.id}: statusToken is ${order.status_token_length} chars (expected 16)`);
        }
        if (order.update_token_length !== 16) {
          console.log(`   ❌ Order ${order.id}: updateToken is ${order.update_token_length} chars (expected 16)`);
        }
      });
    } else {
      console.log('✅ All tokens are 16 characters (correct)');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkStoredTokens();
