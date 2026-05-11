#!/usr/bin/env node
/**
 * Debug: Check what /api/orders actually returns in the response
 */

const baseUrl = 'http://localhost:3001';

async function testCheckoutResponse() {
  const orderData = {
    customerName: 'Debug Test User',
    customerPhone: '9876543210',
    siteAddress: '456 Debug Street, Test City, TC 654322',
    landmark: 'Near Debug Market',
    deliveryType: 'urgent',
    items: [
      { 
        product: { id: 'cement-50kg', name: 'Cement (50kg)', price: 35000 },
        quantity: 2
      }
    ],
    subtotal: 70000,
    convenienceFee: 7000,
    total: 77000,
  };

  try {
    console.log('\n📤 Sending checkout request...');
    console.log('Request body:', JSON.stringify(orderData, null, 2));

    const response = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData),
    });

    const responseData = await response.json();

    console.log('\n📥 API Response:');
    console.log('Status:', response.status);
    console.log('Response body:', JSON.stringify(responseData, null, 2));

    if (responseData.statusToken) {
      console.log('\n✅ statusToken Analysis:');
      console.log('Token:', responseData.statusToken);
      console.log('Length:', responseData.statusToken.length);
      console.log('Type:', typeof responseData.statusToken);
    }

    if (!response.ok) {
      console.error('\n❌ Request failed!');
      console.error('Error:', responseData.error);
      process.exit(1);
    }

    console.log('\n🔗 Testing with this token:');
    console.log(`http://localhost:3001/order/${responseData.statusToken}`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

testCheckoutResponse();
