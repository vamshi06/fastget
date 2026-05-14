#!/usr/bin/env node
/**
 * Test: Verify agent page route is accessible
 */

const baseUrl = 'http://localhost:3001';
const validUpdateToken = '9uceb4zuf220ltdg';

async function testAgentRoute() {
  try {
    console.log(`\n🧪 Testing Agent Page Route\n`);
    console.log(`URL: ${baseUrl}/agent/${validUpdateToken}\n`);

    // Fetch the HTML page (not JSON)
    const response = await fetch(`${baseUrl}/agent/${validUpdateToken}`, {
      headers: {
        'Accept': 'text/html',
      }
    });

    console.log(`Status Code: ${response.status}`);
    console.log(`Status Text: ${response.statusText}`);
    console.log(`Content-Type: ${response.headers.get('content-type')}\n`);

    if (response.ok) {
      const html = await response.text();
      const titleMatch = html.match(/<title>([^<]+)<\/title>/);
      const title = titleMatch ? titleMatch[1] : 'No title found';
      
      console.log(`✅ Page loads successfully!`);
      console.log(`Page title: ${title}`);
      console.log(`HTML length: ${html.length} bytes\n`);
      
      // Check for key elements
      if (html.includes('AgentUpdatePage') || html.includes('PIN') || html.includes('agent')) {
        console.log(`✅ Agent page content detected\n`);
      }
    } else {
      console.error(`❌ Got ${response.status} error`);
      const text = await response.text();
      console.error(`Response: ${text.substring(0, 200)}\n`);
    }

    // Also test with uppercase token (case-sensitivity test)
    console.log(`\n🔤 Testing Token Case-Sensitivity\n`);
    const upperToken = validUpdateToken.toUpperCase();
    console.log(`URL: ${baseUrl}/agent/${upperToken}\n`);

    const response2 = await fetch(`${baseUrl}/agent/${upperToken}`, {
      headers: { 'Accept': 'text/html' }
    });

    console.log(`Status Code: ${response2.status} ${response2.statusText}`);
    if (response2.ok) {
      console.log(`✅ Uppercase token also works (case-insensitive)\n`);
    }

    process.exit(0);
  } catch (error) {
    console.error(`\n❌ Error testing agent route:`);
    console.error(`${error.message}\n`);
    console.error(`Possible causes:`);
    console.error(`  1. Dev server not running on port 3001`);
    console.error(`  2. Network issue`);
    console.error(`  3. Agent route not registered\n`);
    process.exit(1);
  }
}

testAgentRoute();
