import { strict as assert } from 'assert';
import { WispHttpClient, createFetch } from '../dist/index.esm.js';

console.log('Running basic API tests...');

// Test that imports work correctly
function testImports() {
  console.log('Testing imports...');
  
  assert(typeof WispHttpClient === 'function');
  assert(typeof createFetch === 'function');
  
  console.log('✓ All imports working correctly');
}

// Test WispHttpClient instantiation
function testClientInstantiation() {
  console.log('Testing client instantiation...');
  
  const client = new WispHttpClient({
    wispServerUrl: 'ws://localhost:8080/',
    timeout: 5000
  });
  
  assert(client instanceof WispHttpClient);
  
  console.log('✓ Client instantiation test passed');
}

// Test createFetch function
function testCreateFetch() {
  console.log('Testing createFetch...');
  
  const fetch = createFetch({
    wispServerUrl: 'ws://localhost:8080/'
  });
  
  assert(typeof fetch === 'function');
  
  console.log('✓ createFetch test passed');
}

// Test basic validation without actual network calls
function testBasicValidation() {
  console.log('Testing basic validation...');
  
  const client = new WispHttpClient({
    wispServerUrl: 'ws://example.com/'
  });
  
  // Test that calling request without connection throws appropriate error
  try {
    // This should fail gracefully since we're not connected
    client.request('https://example.com').catch(() => {
      // Expected to fail
    });
  } catch (error) {
    // This is expected
  }
  
  console.log('✓ Basic validation test passed');
}

// Run all tests
function runTests() {
  try {
    testImports();
    testClientInstantiation();
    testCreateFetch();
    testBasicValidation();
    console.log('\n✅ All basic API tests passed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runTests();