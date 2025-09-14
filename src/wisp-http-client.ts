import { WispClient } from './wisp-client.js';
import { HttpRequest, HttpResponse, formatHttpRequest, HttpResponseCollector } from './http.js';
import { TlsClient } from './tls-client.js';

/**
 * Configuration for the HTTP client
 */
export interface WispHttpClientConfig {
  wispServerUrl: string;
  timeout?: number;
}

/**
 * Options for making HTTP requests
 */
export interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string | Uint8Array;
  timeout?: number;
}

/**
 * A lightweight HTTP client that uses Wisp protocol for encrypted connections
 */
export class WispHttpClient {
  private _config: WispHttpClientConfig;
  private _client: WispClient | null = null;

  constructor(config: WispHttpClientConfig) {
    this._config = {
      timeout: 30000, // 30 seconds default
      ...config
    };
  }

  /**
   * Connect to the Wisp server
   */
  async connect(): Promise<void> {
    if (this._client) {
      return; // Already connected
    }

    this._client = new WispClient(this._config.wispServerUrl);
    await this._client.connect();
  }

  /**
   * Make an HTTP request with genuine end-to-end encryption for HTTPS
   */
  async request(url: string, options: RequestOptions = {}): Promise<HttpResponse> {
    if (!this._client) {
      await this.connect();
    }

    const parsedUrl = new URL(url);
    const isHttps = parsedUrl.protocol === 'https:';
    const port = parsedUrl.port ? parseInt(parsedUrl.port, 10) : (isHttps ? 443 : 80);
    
    // Prepare request
    const headers: Record<string, string> = {
      'User-Agent': 'WispHttpClient/1.0',
      'Connection': 'close',
      ...options.headers
    };

    let body: Uint8Array | undefined;
    if (options.body) {
      if (typeof options.body === 'string') {
        body = new TextEncoder().encode(options.body);
      } else {
        body = options.body;
      }
      
      if (!headers['Content-Type']) {
        headers['Content-Type'] = 'application/octet-stream';
      }
    }

    const request: HttpRequest = {
      method: options.method || 'GET',
      url,
      headers,
      body
    };

    if (isHttps) {
      // Use TLS client for genuine end-to-end encryption
      return await this._makeHttpsRequest(parsedUrl, request, options);
    } else {
      // Use regular HTTP for non-encrypted requests
      return await this._makeHttpRequest(parsedUrl, request, options);
    }
  }

  /**
   * Make an HTTPS request with genuine end-to-end TLS encryption
   */
  private async _makeHttpsRequest(parsedUrl: URL, request: HttpRequest, options: RequestOptions): Promise<HttpResponse> {
    const port = parsedUrl.port ? parseInt(parsedUrl.port, 10) : 443;
    
    // Create Wisp stream to the target server
    const stream = this._client!.createStream(parsedUrl.hostname, port);
    
    // Create TLS client that will encrypt data before sending through Wisp
    const tlsClient = new TlsClient(parsedUrl.hostname, port, stream);
    
    try {
      // Perform TLS handshake - this establishes genuine end-to-end encryption
      await tlsClient.connect();
      
      // Format HTTP request
      const requestData = formatHttpRequest(request);
      
      // Send encrypted HTTP request through TLS
      await tlsClient.sendApplicationData(requestData);
      
      // Receive and decrypt HTTP response
      return await this._receiveHttpsResponse(tlsClient, options);
      
    } finally {
      tlsClient.close();
      stream.close();
    }
  }

  /**
   * Receive and decrypt HTTPS response
   */
  private async _receiveHttpsResponse(tlsClient: TlsClient, options: RequestOptions): Promise<HttpResponse> {
    return new Promise((resolve, reject) => {
      const collector = new HttpResponseCollector();
      const timeout = options.timeout || this._config.timeout!;
      
      let timeoutId: number | null = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, timeout);

      const cleanup = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      };

      // Continuously receive and decrypt application data
      const receiveLoop = async () => {
        try {
          while (true) {
            const decryptedData = await tlsClient.receiveApplicationData();
            collector.addChunk(decryptedData);
            
            if (collector.isComplete()) {
              cleanup();
              const response = collector.getResponse();
              if (response) {
                resolve(response);
              } else {
                reject(new Error('Failed to parse response'));
              }
              return;
            }
          }
        } catch (error) {
          cleanup();
          // Check if we have a partial response
          const response = collector.getResponse();
          if (response) {
            resolve(response);
          } else {
            reject(new Error(`TLS error: ${error}`));
          }
        }
      };

      receiveLoop();
    });
  }

  /**
   * Make a regular HTTP request (non-encrypted)
   */
  private async _makeHttpRequest(parsedUrl: URL, request: HttpRequest, options: RequestOptions): Promise<HttpResponse> {
    const port = parsedUrl.port ? parseInt(parsedUrl.port, 10) : 80;
    
    // Create stream and send request
    const stream = this._client!.createStream(parsedUrl.hostname, port);
    const requestData = formatHttpRequest(request);
    
    return new Promise((resolve, reject) => {
      const collector = new HttpResponseCollector();
      const timeout = options.timeout || this._config.timeout!;
      
      let timeoutId: number | null = setTimeout(() => {
        stream.close();
        reject(new Error('Request timeout'));
      }, timeout);

      const cleanup = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      };

      stream.addEventListener('data', (event: any) => {
        const data = event.detail as Uint8Array;
        collector.addChunk(data);
        
        if (collector.isComplete()) {
          cleanup();
          const response = collector.getResponse();
          if (response) {
            resolve(response);
          } else {
            reject(new Error('Failed to parse response'));
          }
          stream.close();
        }
      });

      stream.addEventListener('close', () => {
        cleanup();
        const response = collector.getResponse();
        if (response) {
          resolve(response);
        } else {
          reject(new Error('Connection closed before response was complete'));
        }
      });

      stream.addEventListener('error', () => {
        cleanup();
        reject(new Error('Stream error'));
      });

      // Send the request
      if (!stream.send(requestData)) {
        reject(new Error('Failed to send request - buffer full'));
        return;
      }
    });
  }

  /**
   * Make a GET request
   */
  async get(url: string, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<HttpResponse> {
    return this.request(url, { ...options, method: 'GET' });
  }

  /**
   * Make a POST request
   */
  async post(url: string, body?: string | Uint8Array, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<HttpResponse> {
    return this.request(url, { ...options, method: 'POST', body });
  }

  /**
   * Close the connection
   */
  close(): void {
    if (this._client) {
      this._client.close();
      this._client = null;
    }
  }
}

/**
 * Create a fetch-like function using the Wisp HTTP client
 */
export function createFetch(config: WispHttpClientConfig) {
  const client = new WispHttpClient(config);
  
  return async function fetch(input: string | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === 'string' ? input : input.toString();
    
    const options: RequestOptions = {};
    
    if (init) {
      if (init.method) options.method = init.method;
      if (init.headers) {
        options.headers = {};
        if (init.headers instanceof Headers) {
          init.headers.forEach((value, key) => {
            options.headers![key] = value;
          });
        } else if (Array.isArray(init.headers)) {
          init.headers.forEach(([key, value]) => {
            options.headers![key] = value;
          });
        } else {
          Object.assign(options.headers, init.headers);
        }
      }
      if (init.body) {
        if (typeof init.body === 'string') {
          options.body = init.body;
        } else if (init.body instanceof Uint8Array) {
          options.body = init.body;
        } else if (init.body instanceof ArrayBuffer) {
          options.body = new Uint8Array(init.body);
        } else {
          options.body = new TextEncoder().encode(String(init.body));
        }
      }
    }
    
    try {
      const response = await client.request(url, options);
      
      // Convert to fetch Response
      const headers = new Headers();
      for (const [key, value] of Object.entries(response.headers)) {
        headers.set(key, value);
      }
      
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    } catch (error) {
      throw new TypeError(`Failed to fetch: ${error}`);
    }
  };
}