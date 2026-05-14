#!/usr/bin/env node
/**
 * Test: GET /api/orders/pending endpoint
 */

const baseUrl = 'http://localhost:3001';

async function testPendingOrders() {
  try {
    console.log(`\n📋 Testing Agent Dashboard Endpoint\n`);
    
    // Test 1: Get all pending orders
    console.log(`Test 1: Get orders with status='received'\n`);
    const response1 = await fetch(`${baseUrl}/api/orders/pending?status=received`);
    const data1 = await response1.json();
    
    console.log(`Status: ${response1.status}`);
    console.log(`Count: ${data1.count} orders\n`);
    
    if (data1.orders && data1.orders.length > 0) {
      console.log(`Sample order:`);
      const order = data1.orders[0];
      console.log(`  Customer: ${order.customerName}`);
      console.log(`  Phone: ${order.customerPhone}`);
      console.log(`  Status: ${order.status}`);
      console.log(`  Total: ₹${order.total}`);
      console.log(`  Update Token: ${order.updateToken}`);
      console.log(`  Agent URL: ${baseUrl}/agent/${order.updateToken}\n`);
    }
    
    // Test 2: Get eta_assigned orders
    console.log(`Test 2: Get orders with status='eta_assigned'\n`);
    const response2 = await fetch(`${baseUrl}/api/orders/pending?status=eta_assigned`);
    const data2 = await response2.json();
    console.log(`Status: ${response2.status}`);
    console.log(`Count: ${data2.count} orders\n`);
    
    // Test 3: Get all statuses
    console.log(`Test 3: Summary of all statuses\n`);
    const statuses = ['received', 'eta_assigned', 'out_for_delivery', 'delivered', 'cancelled'];
    for (const status of statuses) {
      const res = await fetch(`${baseUrl}/api/orders/pending?status=${status}`);
      const json = await res.json();
      console.log(`  ${status.padEnd(20)} : ${json.count} orders`);
    }
    
    console.log();
    process.exit(0);
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}\n`);
    process.exit(1);
  }
}

testPendingOrders();
