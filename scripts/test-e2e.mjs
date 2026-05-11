#!/usr/bin/env node
/**
 * Comprehensive End-to-End Integration Test
 * Simulates complete order lifecycle:
 * 1. Customer places order (checkout)
 * 2. Customer views order status (tracking page)
 * 3. Agent receives notification and updates status
 * 4. Customer sees status updates
 * 5. Order reaches delivered state
 */

import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.fastget_DATABASE_URL;
const agentPin = process.env.AGENT_PIN || '1234';

if (!databaseUrl) {
  console.error('❌ fastget_DATABASE_URL not set');
  process.exit(1);
}

const sql = neon(databaseUrl);

// Simulate Order type
const createTestOrder = () => ({
  id: `order-${Date.now()}`,
  createdAt: new Date().toISOString(),
  customerName: 'E2E Test Customer',
  customerPhone: '9988776655',
  siteAddress: '789 E2E Test Avenue, Test City, TC 123456',
  landmark: 'Near Test Market',
  deliveryType: 'urgent',
  scheduledTime: null,
  items: [
    { sku: 'cement-50kg', name: 'Cement (50kg)', quantity: 5, price: 35000 },
    { sku: 'steel-10mm', name: 'Steel Rods (10mm)', quantity: 20, price: 80000 },
    { sku: 'sand-bulk', name: 'Sand (Bulk)', quantity: 2, price: 45000 },
  ],
  subtotal: 485000,
  convenienceFee: 48500,
  total: 533500,
  paymentMethod: 'cod',
  status: 'received',
  statusToken: `status-${Date.now()}-${Math.random().toString(36).substring(7)}`,
  updateToken: `update-${Date.now()}-${Math.random().toString(36).substring(7)}`,
});

// Clean up test data
async function cleanup() {
  try {
    await sql`DELETE FROM orders WHERE customer_phone = '9988776655'`;
  } catch (error) {
    console.log('Cleanup note:', error.message);
  }
}

// Phase 1: Customer places order
async function placeOrder(order) {
  try {
    await sql`
      INSERT INTO orders (
        id, created_at, customer_name, customer_phone, site_address, landmark,
        delivery_type, scheduled_time, items, subtotal, convenience_fee, total,
        payment_method, status, eta, status_token, update_token
      ) VALUES (
        ${order.id}, ${order.createdAt}, ${order.customerName}, ${order.customerPhone},
        ${order.siteAddress}, ${order.landmark}, ${order.deliveryType},
        ${order.scheduledTime}, ${JSON.stringify(order.items)}, ${order.subtotal},
        ${order.convenienceFee}, ${order.total}, ${order.paymentMethod}, ${order.status},
        ${null}, ${order.statusToken}, ${order.updateToken}
      )
    `;
    return true;
  } catch (error) {
    console.error('Failed to place order:', error.message);
    return false;
  }
}

// Phase 2: Customer checks order on tracking page
async function customerChecksOrderStatus(statusToken) {
  try {
    const result = await sql`
      SELECT id, status, eta, customer_name, total, items
      FROM orders
      WHERE status_token = ${statusToken}
      LIMIT 1
    `;

    if (result.length === 0) {
      return null;
    }

    return {
      id: result[0].id,
      status: result[0].status,
      eta: result[0].eta,
      customerName: result[0].customer_name,
      total: result[0].total,
      itemCount: (result[0].items || []).length,
    };
  } catch (error) {
    console.error('Failed to fetch order:', error.message);
    return null;
  }
}

// Phase 3: Agent assigns ETA
async function agentAssignsETA(updateToken, pin) {
  try {
    const result = await sql`
      UPDATE orders
      SET status = 'eta_assigned', eta = '2 hours'
      WHERE update_token = ${updateToken} AND status = 'received'
      RETURNING status, eta
    `;

    if (result.length === 0) {
      return { success: false, error: 'Order state changed' };
    }

    return {
      success: true,
      newStatus: result[0].status,
      eta: result[0].eta,
    };
  } catch (error) {
    console.error('Failed to assign ETA:', error.message);
    return { success: false, error: error.message };
  }
}

// Phase 4: Agent marks as out for delivery
async function agentMarkOutForDelivery(updateToken, pin) {
  try {
    const result = await sql`
      UPDATE orders
      SET status = 'out_for_delivery'
      WHERE update_token = ${updateToken} AND status = 'eta_assigned'
      RETURNING status
    `;

    if (result.length === 0) {
      return { success: false, error: 'Order state changed' };
    }

    return {
      success: true,
      newStatus: result[0].status,
    };
  } catch (error) {
    console.error('Failed to mark out for delivery:', error.message);
    return { success: false, error: error.message };
  }
}

// Phase 5: Agent marks as delivered
async function agentMarkDelivered(updateToken, pin) {
  try {
    const result = await sql`
      UPDATE orders
      SET status = 'delivered'
      WHERE update_token = ${updateToken} AND status = 'out_for_delivery'
      RETURNING status
    `;

    if (result.length === 0) {
      return { success: false, error: 'Order state changed' };
    }

    return {
      success: true,
      newStatus: result[0].status,
    };
  } catch (error) {
    console.error('Failed to mark delivered:', error.message);
    return { success: false, error: error.message };
  }
}

// Run test
async function runE2ETest() {
  console.log('=== End-to-End Order Lifecycle Test ===\n');

  const order = createTestOrder();
  let passed = 0;
  let failed = 0;

  try {
    // Cleanup
    await cleanup();

    // Test 1: Customer places order
    console.log('📦 PHASE 1: Customer Places Order\n');
    const placeResult = await placeOrder(order);
    if (placeResult) {
      console.log('✅ Order placed successfully');
      console.log(`   Order ID: ${order.id}`);
      console.log(`   Customer: ${order.customerName}`);
      console.log(`   Amount: ₹${order.total}`);
      console.log(`   Items: ${order.items.length} items`);
      console.log(`   Status Token: ${order.statusToken}`);
      console.log(`   Initial Status: ${order.status}\n`);
      passed++;
    } else {
      console.log('❌ Failed to place order\n');
      failed++;
      process.exit(1);
    }

    // Test 2: Customer views order on tracking page (T+0)
    console.log('📱 PHASE 2: Customer Views Order (T+0 minutes)\n');
    let orderData = await customerChecksOrderStatus(order.statusToken);
    if (orderData && orderData.status === 'received') {
      console.log('✅ Order visible on tracking page');
      console.log(`   Status: ${orderData.status}`);
      console.log(`   ETA: Not assigned yet`);
      console.log(`   Total: ₹${orderData.total}\n`);
      passed++;
    } else {
      console.log('❌ Order not found on tracking page\n');
      failed++;
      process.exit(1);
    }

    // Test 3: Agent confirms and assigns ETA (T+5)
    console.log('👨‍💼 PHASE 3: Agent Confirms & Assigns ETA (T+5 minutes)\n');
    const etaResult = await agentAssignsETA(order.updateToken, agentPin);
    if (etaResult.success) {
      console.log('✅ ETA assigned successfully');
      console.log(`   Status: ${etaResult.newStatus}`);
      console.log(`   ETA: ${etaResult.eta}\n`);
      passed++;
    } else {
      console.log(`❌ Failed to assign ETA: ${etaResult.error}\n`);
      failed++;
      process.exit(1);
    }

    // Test 4: Customer sees ETA update (T+5)
    console.log('📱 PHASE 4: Customer Sees ETA Update (T+5 minutes)\n');
    orderData = await customerChecksOrderStatus(order.statusToken);
    if (orderData && orderData.status === 'eta_assigned' && orderData.eta) {
      console.log('✅ Customer sees ETA on tracking page');
      console.log(`   Status: ${orderData.status}`);
      console.log(`   ETA: ${orderData.eta}\n`);
      passed++;
    } else {
      console.log('❌ ETA not visible to customer\n');
      failed++;
      process.exit(1);
    }

    // Test 5: Agent marks out for delivery (T+60)
    console.log('🚚 PHASE 5: Agent Marks Out For Delivery (T+60 minutes)\n');
    const outForDeliveryResult = await agentMarkOutForDelivery(
      order.updateToken,
      agentPin
    );
    if (outForDeliveryResult.success) {
      console.log('✅ Status updated to out_for_delivery');
      console.log(`   Status: ${outForDeliveryResult.newStatus}\n`);
      passed++;
    } else {
      console.log(
        `❌ Failed to mark out for delivery: ${outForDeliveryResult.error}\n`
      );
      failed++;
      process.exit(1);
    }

    // Test 6: Customer sees delivery status (T+60)
    console.log('📱 PHASE 6: Customer Sees Delivery Status (T+60 minutes)\n');
    orderData = await customerChecksOrderStatus(order.statusToken);
    if (orderData && orderData.status === 'out_for_delivery') {
      console.log('✅ Customer sees out_for_delivery status');
      console.log(`   Status: ${orderData.status}\n`);
      passed++;
    } else {
      console.log('❌ Delivery status not visible to customer\n');
      failed++;
      process.exit(1);
    }

    // Test 7: Agent marks delivered (T+90)
    console.log('✔️  PHASE 7: Agent Marks Delivered (T+90 minutes)\n');
    const deliveredResult = await agentMarkDelivered(order.updateToken, agentPin);
    if (deliveredResult.success) {
      console.log('✅ Status updated to delivered');
      console.log(`   Status: ${deliveredResult.newStatus}\n`);
      passed++;
    } else {
      console.log(`❌ Failed to mark delivered: ${deliveredResult.error}\n`);
      failed++;
      process.exit(1);
    }

    // Test 8: Customer sees final status (T+90)
    console.log('📱 PHASE 8: Customer Sees Delivered Status (T+90 minutes)\n');
    orderData = await customerChecksOrderStatus(order.statusToken);
    if (orderData && orderData.status === 'delivered') {
      console.log('✅ Customer sees delivered status');
      console.log(`   Status: ${orderData.status}`);
      console.log(`   Order Complete!\n`);
      passed++;
    } else {
      console.log('❌ Delivered status not visible to customer\n');
      failed++;
      process.exit(1);
    }

    // Cleanup
    await cleanup();

    console.log('===========================================');
    console.log('=== ✅ End-to-End Test PASSED! ===');
    console.log('===========================================\n');
    console.log('Complete Order Lifecycle:');
    console.log('1. ✅ Order placed with all details');
    console.log('2. ✅ Order visible on customer tracking page');
    console.log('3. ✅ Agent assigned ETA');
    console.log('4. ✅ Customer saw ETA update');
    console.log('5. ✅ Agent marked out for delivery');
    console.log('6. ✅ Customer saw delivery update');
    console.log('7. ✅ Agent marked delivered');
    console.log('8. ✅ Customer saw completion status');
    console.log(`\nTotal Tests: ${passed + failed} | Passed: ${passed} | Failed: ${failed}\n`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    await cleanup();
    process.exit(1);
  }
}

runE2ETest();
