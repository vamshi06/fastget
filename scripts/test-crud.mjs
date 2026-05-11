#!/usr/bin/env node
/**
 * Comprehensive CRUD test for Neon orders database
 * Tests all functions: create, read, update
 */

import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.fastget_DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ fastget_DATABASE_URL not set');
  process.exit(1);
}

const sql = neon(databaseUrl);

// Type definitions (matching src/types/index.ts)
const ORDER_STATUS_TRANSITIONS = {
  received: ['eta_assigned', 'cancelled'],
  eta_assigned: ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

const AGENT_PIN = '1234';

async function dbOrderToOrder(dbOrder) {
  return {
    id: dbOrder.id,
    createdAt: dbOrder.created_at.toISOString(),
    customerName: dbOrder.customer_name,
    customerPhone: dbOrder.customer_phone,
    siteAddress: dbOrder.site_address,
    landmark: dbOrder.landmark || undefined,
    deliveryType: dbOrder.delivery_type,
    scheduledTime: dbOrder.scheduled_time?.toISOString(),
    items: dbOrder.items,
    subtotal: dbOrder.subtotal,
    convenienceFee: dbOrder.convenience_fee,
    total: dbOrder.total,
    paymentMethod: dbOrder.payment_method,
    status: dbOrder.status,
    eta: dbOrder.eta || undefined,
    statusToken: dbOrder.status_token,
    updateToken: dbOrder.update_token,
  };
}

async function createOrder(order) {
  try {
    await sql`
      INSERT INTO orders (
        id, created_at, customer_name, customer_phone, site_address, landmark,
        delivery_type, scheduled_time, items, subtotal, convenience_fee, total,
        payment_method, status, eta, status_token, update_token
      ) VALUES (
        ${order.id}, ${order.createdAt}, ${order.customerName}, ${order.customerPhone},
        ${order.siteAddress}, ${order.landmark || null}, ${order.deliveryType},
        ${order.scheduledTime || null}, ${JSON.stringify(order.items)}, ${order.subtotal},
        ${order.convenienceFee}, ${order.total}, ${order.paymentMethod}, ${order.status},
        ${order.eta || null}, ${order.statusToken}, ${order.updateToken}
      )
    `;
    return true;
  } catch (error) {
    console.error('Failed to create order:', error.message);
    return false;
  }
}

async function getOrderByStatusToken(token) {
  try {
    const result = await sql`SELECT * FROM orders WHERE status_token = ${token} LIMIT 1`;
    if (result.length === 0) return null;
    return dbOrderToOrder(result[0]);
  } catch (error) {
    console.error('Failed to get order:', error.message);
    return null;
  }
}

async function getOrderByUpdateToken(token) {
  try {
    const result = await sql`SELECT * FROM orders WHERE update_token = ${token} LIMIT 1`;
    if (result.length === 0) return null;
    return dbOrderToOrder(result[0]);
  } catch (error) {
    console.error('Failed to get order by update token:', error.message);
    return null;
  }
}

async function updateOrderStatus(updateToken, newStatus, pin, eta = null) {
  try {
    if (pin !== AGENT_PIN) {
      return { success: false, error: 'Invalid PIN' };
    }

    const currentOrder = await getOrderByUpdateToken(updateToken);
    if (!currentOrder) {
      return { success: false, error: 'Order not found' };
    }

    const validTransitions = ORDER_STATUS_TRANSITIONS[currentOrder.status];
    if (!validTransitions.includes(newStatus)) {
      return {
        success: false,
        error: `Cannot transition from ${currentOrder.status} to ${newStatus}`,
      };
    }

    let result;
    if (eta) {
      result = await sql`
        UPDATE orders
        SET status = ${newStatus}, eta = ${eta}
        WHERE update_token = ${updateToken} AND status = ${currentOrder.status}
        RETURNING id
      `;
    } else {
      result = await sql`
        UPDATE orders
        SET status = ${newStatus}
        WHERE update_token = ${updateToken} AND status = ${currentOrder.status}
        RETURNING id
      `;
    }

    if (result.length === 0) {
      return { success: false, error: 'Order status changed by another agent. Please refresh.' };
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to update order status:', error.message);
    return { success: false, error: 'Database error' };
  }
}

async function cleanupTestOrders() {
  try {
    await sql`DELETE FROM orders WHERE customer_phone = '9876543210'`;
  } catch (error) {
    console.error('Cleanup warning:', error.message);
  }
}

// Test suite
async function runTests() {
  console.log('=== Neon Order CRUD Tests ===\n');

  // Generate test data
  const testOrderId = `test-${Date.now()}`;
  const testStatusToken = `status-${Date.now()}`;
  const testUpdateToken = `update-${Date.now()}`;

  const testOrder = {
    id: testOrderId,
    createdAt: new Date().toISOString(),
    customerName: 'Test Customer',
    customerPhone: '9876543210',
    siteAddress: '123 Test Street, Test City',
    landmark: 'Near Test Landmark',
    deliveryType: 'urgent',
    scheduledTime: null,
    items: [
      { sku: 'prod-1', name: 'Test Product', quantity: 2, price: 50000 },
      { sku: 'prod-2', name: 'Another Product', quantity: 1, price: 30000 },
    ],
    subtotal: 130000,
    convenienceFee: 13000,
    total: 143000,
    paymentMethod: 'cod',
    status: 'received',
    eta: null,
    statusToken: testStatusToken,
    updateToken: testUpdateToken,
  };

  try {
    // Cleanup first
    await cleanupTestOrders();

    // Test 1: Create Order
    console.log('📝 Test 1: Create Order');
    const createResult = await createOrder(testOrder);
    if (createResult) {
      console.log('✅ Order created successfully');
      console.log(`   ID: ${testOrderId}`);
      console.log(`   Status Token: ${testStatusToken}`);
      console.log(`   Update Token: ${testUpdateToken}\n`);
    } else {
      console.log('❌ Failed to create order\n');
      process.exit(1);
    }

    // Test 2: Retrieve by Status Token
    console.log('🔍 Test 2: Retrieve by Status Token');
    const fetchedOrder = await getOrderByStatusToken(testStatusToken);
    if (fetchedOrder) {
      console.log('✅ Order retrieved successfully');
      console.log(`   Customer: ${fetchedOrder.customerName}`);
      console.log(`   Phone: ${fetchedOrder.customerPhone}`);
      console.log(`   Items: ${fetchedOrder.items.length}`);
      console.log(`   Total: ₹${fetchedOrder.total}`);
      console.log(`   Status: ${fetchedOrder.status}\n`);
    } else {
      console.log('❌ Failed to retrieve order\n');
      process.exit(1);
    }

    // Test 3: Retrieve by Update Token
    console.log('🔍 Test 3: Retrieve by Update Token');
    const fetchedByUpdate = await getOrderByUpdateToken(testUpdateToken);
    if (fetchedByUpdate && fetchedByUpdate.id === testOrderId) {
      console.log('✅ Order retrieved by update token');
      console.log(`   Matches created order: ✅\n`);
    } else {
      console.log('❌ Failed to retrieve by update token\n');
      process.exit(1);
    }

    // Test 4: Invalid Token
    console.log('🔍 Test 4: Invalid Token');
    const invalidFetch = await getOrderByStatusToken('invalid-token-12345');
    if (invalidFetch === null) {
      console.log('✅ Correctly returned null for invalid token\n');
    } else {
      console.log('❌ Should return null for invalid token\n');
      process.exit(1);
    }

    // Test 5: Update Status - Valid Transition
    console.log('✏️  Test 5: Update Status - Valid Transition');
    const updateResult1 = await updateOrderStatus(
      testUpdateToken,
      'eta_assigned',
      AGENT_PIN,
      '2 hours'
    );
    if (updateResult1.success) {
      console.log('✅ Status updated to eta_assigned');
      const updated = await getOrderByStatusToken(testStatusToken);
      console.log(`   New Status: ${updated.status}`);
      console.log(`   ETA: ${updated.eta}\n`);
    } else {
      console.log(`❌ Status update failed: ${updateResult1.error}\n`);
      process.exit(1);
    }

    // Test 6: Update Status - Another Valid Transition
    console.log('✏️  Test 6: Update Status - Another Valid Transition');
    const updateResult2 = await updateOrderStatus(
      testUpdateToken,
      'out_for_delivery',
      AGENT_PIN
    );
    if (updateResult2.success) {
      console.log('✅ Status updated to out_for_delivery');
      const updated = await getOrderByStatusToken(testStatusToken);
      console.log(`   New Status: ${updated.status}\n`);
    } else {
      console.log(`❌ Status update failed: ${updateResult2.error}\n`);
      process.exit(1);
    }

    // Test 7: Invalid State Transition
    console.log('❌ Test 7: Invalid State Transition');
    const invalidTransition = await updateOrderStatus(
      testUpdateToken,
      'received',
      AGENT_PIN
    );
    if (!invalidTransition.success) {
      console.log('✅ Correctly rejected invalid transition');
      console.log(`   Error: ${invalidTransition.error}\n`);
    } else {
      console.log('❌ Should reject invalid transition\n');
      process.exit(1);
    }

    // Test 8: Wrong PIN
    console.log('🔐 Test 8: Wrong PIN');
    const wrongPin = await updateOrderStatus(testUpdateToken, 'delivered', '9999');
    if (!wrongPin.success && wrongPin.error === 'Invalid PIN') {
      console.log('✅ Correctly rejected wrong PIN\n');
    } else {
      console.log('❌ Should reject wrong PIN\n');
      process.exit(1);
    }

    // Test 9: Delivery (Final Status)
    console.log('✏️  Test 9: Final Transition to Delivered');
    const updateResult3 = await updateOrderStatus(testUpdateToken, 'delivered', AGENT_PIN);
    if (updateResult3.success) {
      console.log('✅ Status updated to delivered');
      const updated = await getOrderByStatusToken(testStatusToken);
      console.log(`   New Status: ${updated.status}\n`);
    } else {
      console.log(`❌ Status update failed: ${updateResult3.error}\n`);
      process.exit(1);
    }

    // Test 10: No further transitions from Delivered
    console.log('❌ Test 10: No Transitions from Delivered');
    const noMoreTransitions = await updateOrderStatus(
      testUpdateToken,
      'cancelled',
      AGENT_PIN
    );
    if (!noMoreTransitions.success) {
      console.log('✅ Correctly blocked transition from delivered');
      console.log(`   Error: ${noMoreTransitions.error}\n`);
    } else {
      console.log('❌ Should block transition from delivered\n');
      process.exit(1);
    }

    // Cleanup
    await cleanupTestOrders();

    console.log('=== ✅ All Tests Passed! ===\n');
    console.log('Summary:');
    console.log('✅ Create order with all fields');
    console.log('✅ Retrieve by status token');
    console.log('✅ Retrieve by update token');
    console.log('✅ Invalid token returns null');
    console.log('✅ Valid state transitions allowed');
    console.log('✅ Invalid state transitions blocked');
    console.log('✅ Wrong PIN rejected');
    console.log('✅ Final status blocks further transitions');
    console.log('✅ Error handling works correctly');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  }
}

runTests();
