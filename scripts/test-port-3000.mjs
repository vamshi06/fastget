#!/usr/bin/env node
/**
 * Test: Check which routes work on port 3000
 */

const baseUrl = 'http://localhost:3000';

async function testRoutes() {
  const routes = [
    '/',
    '/catalog',
    '/cart',
    '/checkout',
    '/order/nz9uh5ircpjpd1ia',
    '/agent/mrstgf5xf3zxfvcl',
    '/api/orders',
  ];

  console.log(`\n🧪 Testing Routes on Port 3000\n`);
  console.log(`Base URL: ${baseUrl}\n`);
  console.log(`Route Status\n${'─'.repeat(50)}\n`);

  for (const route of routes) {
    try {
      const response = await fetch(`${baseUrl}${route}`, {
        headers: { 'Accept': 'text/html,application/json' }
      });
      
      const isHtml = route.startsWith('/api') === false;
      const emoji = response.ok ? '✅' : '❌';
      const status = `${response.status} ${response.statusText}`;
      
      console.log(`${emoji} ${route.padEnd(35)} ${status}`);
    } catch (error) {
      console.log(`❌ ${route.padEnd(35)} ${error.message}`);
    }
  }

  console.log();
  process.exit(0);
}

testRoutes();
