#!/usr/bin/env node
/**
 * Quick order creation test - generates a real token for browser QA
 */

import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.fastget_DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ fastget_DATABASE_URL not set');
  process.exit(1);
}

const sql = neon(databaseUrl);

function generateToken() {
  return Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 36).toString(36)
  ).join('');
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function createTestOrder() {
  const order = {
    id: generateUUID(),
    createdAt: new Date().toISOString(),
    customerName: 'QA Test Customer',
    customerPhone: '9999888877',
    siteAddress: '123 Test Street, Test City, TC 654321',
    landmark: 'Near Test Market',
    deliveryType: 'urgent',
    scheduledTime: null,
    items: [
      { sku: 'cement-50kg', name: 'Cement (50kg)', quantity: 2, price: 35000 },
      { sku: 'steel-10mm', name: 'Steel Rods (10mm)', quantity: 5, price: 80000 },
    ],
    subtotal: 470000,
    convenienceFee: 47000,
    total: 517000,
    paymentMethod: 'cod',
    status: 'received',
    statusToken: generateToken(),
    updateToken: generateToken(),
  };

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

    console.log(`
✅ Test Order Created Successfully!

📋 ORDER DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Order ID:        ${order.id}
Customer:        ${order.customerName}
Phone:           ${order.customerPhone}
Address:         ${order.siteAddress}
Total:           ₹${order.total}
Status:          ${order.status}


🔗 BROWSER QA LINKS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📱 Customer Tracking Page:
   http://localhost:3001/order/${order.statusToken}

👨‍💼 Agent Update Page (with PIN):
   http://localhost:3001/agent/${order.updateToken}


🔐 AGENT PIN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Use PIN: 1234


📝 TESTING INSTRUCTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Open customer tracking page URL in browser
   → Should see order details with status "Order Received"

2. Open agent update page URL in browser
   → Enter PIN: 1234
   → Change status to "ETA Assigned"
   → Enter ETA: "2 hours"

3. Refresh customer tracking page
   → Should see status updated to "ETA Assigned"
   → Should see ETA: "2 hours"

4. Try wrong PIN on agent page
   → Should see error: "Invalid PIN"
    `);

    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to create order:', error.message);
    process.exit(1);
  }
}

createTestOrder();
