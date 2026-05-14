#!/usr/bin/env node
/**
 * Check if the token exists in database
 */

import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.fastget_DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ fastget_DATABASE_URL not set');
  process.exit(1);
}

const sql = neon(databaseUrl);

async function checkToken() {
  const token = '9uceb4zuf220ltdg';

  try {
    console.log(`\n🔍 Searching for token: ${token}\n`);

    // Search for token as update_token
    const result = await sql`
      SELECT 
        id,
        customer_name,
        status,
        update_token,
        status_token
      FROM orders 
      WHERE update_token = ${token} 
         OR status_token = ${token}
      LIMIT 1
    `;

    if (result.length === 0) {
      console.log(`❌ Token NOT found in database\n`);
      console.log(`This token doesn't exist. You need to:`);
      console.log(`  1. Create an order (via checkout or test script)`);
      console.log(`  2. Get the updateToken from that order`);
      console.log(`  3. Use that token in /agent/[token]\n`);
      
      console.log(`📋 Available tokens in database:\n`);
      const allOrders = await sql`
        SELECT customer_name, update_token, status_token, status
        FROM orders
        ORDER BY created_at DESC
        LIMIT 5
      `;
      
      allOrders.forEach((order, i) => {
        console.log(`${i + 1}. ${order.customer_name}`);
        console.log(`   Update Token: ${order.update_token}`);
        console.log(`   Status Token: ${order.status_token}`);
        console.log(`   Status: ${order.status}\n`);
      });
    } else {
      const order = result[0];
      console.log(`✅ Token FOUND!\n`);
      console.log(`Order ID: ${order.id}`);
      console.log(`Customer: ${order.customer_name}`);
      console.log(`Current Status: ${order.status}`);
      console.log(`Update Token: ${order.update_token}`);
      console.log(`Status Token: ${order.status_token}\n`);
      console.log(`✅ This token should work!`);
      console.log(`Try: http://localhost:3000/agent/${order.update_token}\n`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkToken();
