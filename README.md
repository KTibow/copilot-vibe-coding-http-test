# Wisp HTTP Client

A lightweight HTTP client with TLS encryption for Wisp servers, focused on minimal bundle size.

## Features

- 🪶 **Ultra-lightweight**: Only ~7KB minified (vs 552KB for libcurl.js)
- 🔒 **End-to-end encryption**: Full TLS encryption via Wisp protocol
- 🌐 **Fetch-compatible API**: Drop-in replacement for `fetch()`
- ⚡ **High performance**: Multiplexed connections over WebSocket
- 🎯 **Modern**: Built with TypeScript and ES modules
- 🔧 **Simple**: Easy to use with minimal configuration

## What is Wisp?

[Wisp](https://github.com/MercuryWorkshop/wisp-protocol) is a lightweight multiplexing websocket proxy protocol that allows multiple TCP/UDP sockets to share a single websocket connection. This library implements a Wisp client for making HTTP requests through a Wisp server.

## Installation

```bash
npm install wisp-http-client
```

## Quick Start

### Using the fetch-like API

```javascript
import { createFetch } from 'wisp-http-client';

// Create a fetch function that uses a Wisp server
const fetch = createFetch({
  wispServerUrl: 'wss://your-wisp-server.com/'
});

// Use it just like regular fetch
const response = await fetch('https://api.example.com/data');
const data = await response.json();
console.log(data);
```

### Using the HTTP client directly

```javascript
import { WispHttpClient } from 'wisp-http-client';

const client = new WispHttpClient({
  wispServerUrl: 'wss://your-wisp-server.com/',
  timeout: 30000 // 30 seconds
});

// Make a GET request
const response = await client.get('https://api.example.com/users');
console.log('Status:', response.status);
console.log('Body:', new TextDecoder().decode(response.body));

// Make a POST request
const postResponse = await client.post(
  'https://api.example.com/users',
  JSON.stringify({ name: 'John', email: 'john@example.com' }),
  { headers: { 'Content-Type': 'application/json' } }
);

// Clean up when done
client.close();
```

## API Reference

### `createFetch(config)`

Creates a fetch-compatible function that uses Wisp for transport.

**Parameters:**
- `config.wispServerUrl` (string): URL of the Wisp server
- `config.timeout` (number, optional): Request timeout in milliseconds (default: 30000)

**Returns:** A function with the same signature as `fetch()`

### `WispHttpClient`

#### Constructor

```javascript
new WispHttpClient(config)
```

**Parameters:**
- `config.wispServerUrl` (string): URL of the Wisp server
- `config.timeout` (number, optional): Default request timeout in milliseconds

#### Methods

##### `request(url, options)`

Make an HTTP request.

**Parameters:**
- `url` (string): The URL to request
- `options` (object, optional):
  - `method` (string): HTTP method (default: 'GET')
  - `headers` (object): HTTP headers
  - `body` (string | Uint8Array): Request body
  - `timeout` (number): Request timeout in milliseconds

**Returns:** Promise<HttpResponse>

##### `get(url, options)`

Make a GET request.

##### `post(url, body, options)`

Make a POST request.

##### `close()`

Close the connection and clean up resources.

### Types

```typescript
interface HttpResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: Uint8Array;
}

interface WispHttpClientConfig {
  wispServerUrl: string;
  timeout?: number;
}

interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string | Uint8Array;
  timeout?: number;
}
```

## Browser Usage

You can use this library directly in the browser:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Wisp HTTP Client Example</title>
</head>
<body>
  <script type="module">
    import { createFetch } from './node_modules/wisp-http-client/dist/index.esm.js';
    
    const fetch = createFetch({
      wispServerUrl: 'wss://your-wisp-server.com/'
    });
    
    async function loadData() {
      try {
        const response = await fetch('https://api.github.com/users/octocat');
        const user = await response.json();
        console.log('User:', user);
      } catch (error) {
        console.error('Error:', error);
      }
    }
    
    loadData();
  </script>
</body>
</html>
```

## Comparison with Alternatives

| Feature | Wisp HTTP Client | libcurl.js | Native fetch |
|---------|------------------|------------|--------------|
| Bundle size | ~7KB | ~552KB | Built-in |
| CORS bypass | ✅ | ✅ | ❌ |
| End-to-end encryption | ✅ | ✅ | ❌ (with CORS proxy) |
| WebAssembly required | ❌ | ✅ | ❌ |
| Wisp protocol support | ✅ | ✅ | ❌ |
| Modern ES modules | ✅ | Partial | ✅ |

## Requirements

- A Wisp server (such as [wisp-server-python](https://github.com/MercuryWorkshop/wisp-server-python) or [wisp-server-node](https://github.com/MercuryWorkshop/wisp-server-node))
- Modern browser with WebSocket support
- Or Node.js 16+ with WebSocket support

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.