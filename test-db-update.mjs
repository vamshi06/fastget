import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.fastget_DATABASE_URL || process.env.DATABASE_URL;
const sql = neon(databaseUrl);

const updateToken = 'wil0jdekvceeni4l';

console.log('📋 Testing order update flow...\n');

// Step 1: Check current status
console.log('1️⃣ Current status before update:');
let result = await sql`SELECT id, status, eta FROM orders WHERE update_token = ${updateToken}`;
console.log('   Status:', result[0]?.status);
console.log('   ETA:', result[0]?.eta);

// Step 2: Update the order (simulate what the form does)
console.log('\n2️⃣ Updating order to out_for_delivery with ETA...');
result = await sql`
  UPDATE orders 
  SET status = 'out_for_delivery', eta = '4:00 PM - 4:30 PM'
  WHERE update_token = ${updateToken} AND status = 'eta_assigned'
  RETURNING id, status, eta
`;

if (result.length > 0) {
  console.log('   ✅ Update successful');
  console.log('   New Status:', result[0].status);
  console.log('   New ETA:', result[0].eta);
} else {
  console.log('   ❌ Update failed - no rows affected');
}

// Step 3: Verify it persisted
console.log('\n3️⃣ Verifying in database:');
result = await sql`SELECT id, status, eta FROM orders WHERE update_token = ${updateToken}`;
console.log('   Status:', result[0]?.status);
console.log('   ETA:', result[0]?.eta);

console.log('\n✅ Test complete');
