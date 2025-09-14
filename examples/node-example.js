import { WispHttpClient, createFetch } from '../dist/index.esm.js';

// Example 1: Using the HTTP client directly
console.log('=== Example 1: Using WispHttpClient directly ===');

async function exampleWithHttpClient() {
  const client = new WispHttpClient({
    wispServerUrl: 'wss://your-wisp-server.com/', // Replace with your Wisp server
    timeout: 10000 // 10 seconds
  });

  try {
    // Make a GET request
    console.log('Making GET request...');
    const response = await client.get('https://httpbin.org/get');
    
    console.log('Status:', response.status);
    console.log('Headers:', response.headers);
    console.log('Body:', new TextDecoder().decode(response.body));

    // Make a POST request
    console.log('\nMaking POST request...');
    const postData = JSON.stringify({
      message: 'Hello from Wisp HTTP Client!',
      timestamp: new Date().toISOString()
    });

    const postResponse = await client.post('https://httpbin.org/post', postData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('POST Status:', postResponse.status);
    console.log('POST Body:', new TextDecoder().decode(postResponse.body));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    // Always clean up
    client.close();
  }
}

// Example 2: Using the fetch-like API
console.log('\n=== Example 2: Using createFetch API ===');

async function exampleWithFetch() {
  const fetch = createFetch({
    wispServerUrl: 'wss://your-wisp-server.com/' // Replace with your Wisp server
  });

  try {
    // GET request with fetch API
    console.log('Making GET request with fetch API...');
    const response = await fetch('https://httpbin.org/json');
    const data = await response.json();
    
    console.log('Response data:', data);

    // POST request with fetch API
    console.log('\nMaking POST request with fetch API...');
    const postResponse = await fetch('https://httpbin.org/post', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        greeting: 'Hello, World!',
        client: 'wisp-http-client'
      })
    });

    const postData = await postResponse.json();
    console.log('POST response:', postData);

  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Example 3: Error handling and timeouts
console.log('\n=== Example 3: Error handling and timeouts ===');

async function exampleErrorHandling() {
  const client = new WispHttpClient({
    wispServerUrl: 'wss://your-wisp-server.com/', // Replace with your Wisp server
    timeout: 5000 // 5 seconds
  });

  try {
    // Request to a slow endpoint (will timeout)
    console.log('Making request that will timeout...');
    await client.get('https://httpbin.org/delay/10'); // 10 second delay, 5 second timeout
  } catch (error) {
    console.log('Expected timeout error:', error.message);
  }

  try {
    // Request to invalid domain
    console.log('Making request to invalid domain...');
    await client.get('https://invalid-domain-that-does-not-exist.com');
  } catch (error) {
    console.log('Expected DNS error:', error.message);
  } finally {
    client.close();
  }
}

// Example 4: Custom headers and authentication
console.log('\n=== Example 4: Custom headers and authentication ===');

async function exampleCustomHeaders() {
  const client = new WispHttpClient({
    wispServerUrl: 'wss://your-wisp-server.com/' // Replace with your Wisp server
  });

  try {
    // Request with custom headers
    console.log('Making request with custom headers...');
    const response = await client.get('https://httpbin.org/headers', {
      headers: {
        'User-Agent': 'WispHttpClient/1.0 Example',
        'X-Custom-Header': 'MyCustomValue',
        'Authorization': 'Bearer your-token-here'
      }
    });

    const data = JSON.parse(new TextDecoder().decode(response.body));
    console.log('Request headers sent:', data.headers);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    client.close();
  }
}

// Run examples (commented out because they require a real Wisp server)
console.log('Note: These examples require a running Wisp server.');
console.log('Replace "wss://your-wisp-server.com/" with your actual Wisp server URL.');
console.log('Uncomment the lines below to run the examples:');

// Uncomment these to run the examples with a real Wisp server:
// await exampleWithHttpClient();
// await exampleWithFetch();
// await exampleErrorHandling();
// await exampleCustomHeaders();

console.log('\nExamples completed!');