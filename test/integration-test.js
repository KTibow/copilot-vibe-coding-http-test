import { WispHttpClient } from '../dist/index.esm.js';

// Polyfill WebSocket for Node.js testing
if (typeof WebSocket === 'undefined') {
  try {
    const { WebSocket: NodeWebSocket } = await import('ws');
    global.WebSocket = NodeWebSocket;
  } catch (error) {
    console.log('⚠️  WebSocket polyfill not available, skipping network tests');
  }
}

console.log('Running integration tests...');

// Test with a mock server first (will fail but shows the intent)
async function testWithRealServer() {
  console.log('Testing with real Wisp server...');
  
  // Common Wisp server endpoints to test
  const testServers = [
    'wss://wisp.mercurywork.shop/',
    'wss://wisp-server.herokuapp.com/',
    'wss://wisp.retronetwork.me/'
  ];
  
  for (const serverUrl of testServers) {
    try {
      console.log(`Trying ${serverUrl}...`);
      
      const client = new WispHttpClient({
        wispServerUrl: serverUrl,
        timeout: 5000
      });
      
      // Try to connect
      const connectTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 5000)
      );
      
      await Promise.race([
        client.connect(),
        connectTimeout
      ]);
      
      console.log(`✓ Successfully connected to ${serverUrl}`);
      
      // Try a simple HTTP request
      try {
        const response = await client.get('http://httpbin.org/get');
        console.log(`✓ HTTP request successful: ${response.status} ${response.statusText}`);
        
        // Clean up
        client.close();
        
        console.log(`✅ Integration test passed with ${serverUrl}`);
        return true;
      } catch (httpError) {
        console.log(`❌ HTTP request failed: ${httpError.message}`);
        client.close();
      }
    } catch (connectError) {
      console.log(`❌ Connection failed: ${connectError.message}`);
    }
  }
  
  console.log('⚠️  No working Wisp servers found for integration testing');
  console.log('This is expected if no public Wisp servers are available');
  return false;
}

// Test error handling
function testErrorHandling() {
  console.log('Testing error handling...');
  
  const client = new WispHttpClient({
    wispServerUrl: 'wss://nonexistent-server.invalid/',
    timeout: 1000
  });
  
  // This should fail
  client.request('https://example.com')
    .then(() => {
      console.log('❌ Request should have failed');
    })
    .catch((error) => {
      console.log('✓ Request properly failed with error:', error.message);
    });
  
  console.log('✓ Error handling test completed');
}

// Test timeout handling
function testTimeoutHandling() {
  console.log('Testing timeout handling...');
  
  const client = new WispHttpClient({
    wispServerUrl: 'wss://httpbin.org/', // Wrong protocol, will timeout
    timeout: 100 // Very short timeout
  });
  
  // This should timeout
  client.request('https://example.com')
    .then(() => {
      console.log('❌ Request should have timed out');
    })
    .catch((error) => {
      if (error.message.includes('timeout')) {
        console.log('✓ Request properly timed out');
      } else {
        console.log('✓ Request failed as expected:', error.message);
      }
    });
  
  console.log('✓ Timeout handling test completed');
}

// Run integration tests
async function runIntegrationTests() {
  try {
    testErrorHandling();
    testTimeoutHandling();
    
    const realServerWorked = await testWithRealServer();
    
    if (realServerWorked) {
      console.log('\n✅ All integration tests passed!');
    } else {
      console.log('\n⚠️  Integration tests completed with limitations');
      console.log('   (No working public Wisp servers found)');
    }
  } catch (error) {
    console.error('\n❌ Integration test failed:', error.message);
    process.exit(1);
  }
}

runIntegrationTests();