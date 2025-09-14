import { strict as assert } from 'assert';
import { formatHttpRequest, parseHttpResponse, HttpResponseCollector } from '../dist/index.esm.js';

console.log('Running HTTP tests...');

// Test HTTP request formatting
function testHttpRequestFormatting() {
  console.log('Testing HTTP request formatting...');
  
  const request = {
    method: 'GET',
    url: 'https://example.com/path?query=value',
    headers: {
      'User-Agent': 'Test/1.0',
      'Accept': 'text/html'
    }
  };
  
  const formatted = formatHttpRequest(request);
  const text = new TextDecoder().decode(formatted);
  
  // Check the format
  assert(text.includes('GET /path?query=value HTTP/1.1\r\n'));
  assert(text.includes('Host: example.com\r\n'));
  assert(text.includes('User-Agent: Test/1.0\r\n'));
  assert(text.includes('Accept: text/html\r\n'));
  assert(text.endsWith('\r\n\r\n'));
  
  console.log('✓ HTTP request formatting test passed');
}

// Test HTTP request with body
function testHttpRequestWithBody() {
  console.log('Testing HTTP request with body...');
  
  const body = new TextEncoder().encode('{"test": "data"}');
  const request = {
    method: 'POST',
    url: 'https://api.example.com/data',
    headers: {
      'Content-Type': 'application/json'
    },
    body
  };
  
  const formatted = formatHttpRequest(request);
  const text = new TextDecoder().decode(formatted);
  
  assert(text.includes('POST /data HTTP/1.1\r\n'));
  assert(text.includes('Content-Length: 16\r\n'));
  assert(text.includes('Content-Type: application/json\r\n'));
  assert(text.endsWith('\r\n\r\n{"test": "data"}'));
  
  console.log('✓ HTTP request with body test passed');
}

// Test HTTP response parsing
function testHttpResponseParsing() {
  console.log('Testing HTTP response parsing...');
  
  const responseText = 
    'HTTP/1.1 200 OK\r\n' +
    'Content-Type: text/plain\r\n' +
    'Content-Length: 13\r\n' +
    '\r\n' +
    'Hello, World!';
  
  const responseBytes = new TextEncoder().encode(responseText);
  const parsed = parseHttpResponse(responseBytes);
  
  assert.equal(parsed.status, 200);
  assert.equal(parsed.statusText, 'OK');
  assert.equal(parsed.headers['content-type'], 'text/plain');
  assert.equal(parsed.headers['content-length'], '13');
  
  const bodyText = new TextDecoder().decode(parsed.body);
  assert.equal(bodyText, 'Hello, World!');
  
  console.log('✓ HTTP response parsing test passed');
}

// Test HTTP response collector
function testHttpResponseCollector() {
  console.log('Testing HTTP response collector...');
  
  const collector = new HttpResponseCollector();
  
  // Add headers chunk
  const headers = new TextEncoder().encode(
    'HTTP/1.1 200 OK\r\n' +
    'Content-Type: text/plain\r\n' +
    'Content-Length: 5\r\n' +
    '\r\n'
  );
  
  collector.addChunk(headers);
  assert(!collector.isComplete());
  
  // Add body chunk
  const body = new TextEncoder().encode('Hello');
  collector.addChunk(body);
  
  assert(collector.isComplete());
  
  const response = collector.getResponse();
  assert(response);
  assert.equal(response.status, 200);
  assert.equal(response.headers['content-length'], '5');
  
  const bodyText = new TextDecoder().decode(response.body);
  assert.equal(bodyText, 'Hello');
  
  console.log('✓ HTTP response collector test passed');
}

// Run all tests
function runTests() {
  try {
    testHttpRequestFormatting();
    testHttpRequestWithBody();
    testHttpResponseParsing();
    testHttpResponseCollector();
    console.log('\n✅ All HTTP tests passed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

runTests();