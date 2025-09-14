/**
 * HTTP request/response handling utilities
 */

export interface HttpRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: Uint8Array;
}

export interface HttpResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: Uint8Array;
}

/**
 * Format an HTTP request as raw HTTP/1.1 text
 */
export function formatHttpRequest(request: HttpRequest): Uint8Array {
  const url = new URL(request.url);
  const path = url.pathname + url.search;
  
  let httpText = `${request.method} ${path} HTTP/1.1\r\n`;
  httpText += `Host: ${url.host}\r\n`;
  
  // Add other headers
  for (const [key, value] of Object.entries(request.headers)) {
    if (key.toLowerCase() !== 'host') {
      httpText += `${key}: ${value}\r\n`;
    }
  }
  
  // Add Content-Length if there's a body
  if (request.body && request.body.length > 0) {
    httpText += `Content-Length: ${request.body.length}\r\n`;
  }
  
  httpText += '\r\n'; // End of headers
  
  const headerBytes = new TextEncoder().encode(httpText);
  
  if (request.body && request.body.length > 0) {
    // Combine headers and body
    const combined = new Uint8Array(headerBytes.length + request.body.length);
    combined.set(headerBytes, 0);
    combined.set(request.body, headerBytes.length);
    return combined;
  }
  
  return headerBytes;
}

/**
 * Parse an HTTP response from raw HTTP/1.1 text
 */
export function parseHttpResponse(data: Uint8Array): HttpResponse {
  const text = new TextDecoder().decode(data);
  const lines = text.split('\r\n');
  
  if (lines.length === 0) {
    throw new Error('Invalid HTTP response');
  }
  
  // Parse status line
  const statusLine = lines[0];
  const statusMatch = statusLine.match(/^HTTP\/1\.[01] (\d+) (.*)$/);
  if (!statusMatch) {
    throw new Error('Invalid HTTP status line');
  }
  
  const status = parseInt(statusMatch[1], 10);
  const statusText = statusMatch[2];
  
  // Parse headers
  const headers: Record<string, string> = {};
  let headerEndIndex = 1;
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line === '') {
      headerEndIndex = i;
      break;
    }
    
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim().toLowerCase();
      const value = line.substring(colonIndex + 1).trim();
      headers[key] = value;
    }
  }
  
  // Extract body
  const headerText = lines.slice(0, headerEndIndex + 1).join('\r\n');
  const headerBytes = new TextEncoder().encode(headerText + '\r\n'); // Add the final \r\n
  const body = data.slice(headerBytes.length);
  
  return {
    status,
    statusText,
    headers,
    body
  };
}

/**
 * Collect all data from multiple chunks into a single response
 */
export class HttpResponseCollector {
  private _chunks: Uint8Array[] = [];
  private _totalLength: number = 0;
  private _headersParsed: boolean = false;
  private _response: Partial<HttpResponse> | null = null;
  private _contentLength: number | null = null;
  private _bodyReceived: number = 0;

  addChunk(chunk: Uint8Array): void {
    this._chunks.push(chunk);
    this._totalLength += chunk.length;
    
    if (!this._headersParsed) {
      this._tryParseHeaders();
    } else {
      // Update body received count
      this._bodyReceived += chunk.length;
    }
  }

  private _tryParseHeaders(): void {
    // Combine all chunks to look for end of headers
    const combined = new Uint8Array(this._totalLength);
    let offset = 0;
    for (const chunk of this._chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }
    
    const text = new TextDecoder().decode(combined);
    const headerEndIndex = text.indexOf('\r\n\r\n');
    
    if (headerEndIndex !== -1) {
      // Headers found, parse them
      const headerText = text.substring(0, headerEndIndex + 4);
      const headerBytes = new TextEncoder().encode(headerText);
      
      try {
        // Parse headers manually since parseHttpResponse expects complete response
        const lines = headerText.split('\r\n');
        
        // Parse status line
        const statusLine = lines[0];
        const statusMatch = statusLine.match(/^HTTP\/1\.[01] (\d+) (.*)$/);
        if (!statusMatch) {
          throw new Error('Invalid HTTP status line');
        }
        
        const status = parseInt(statusMatch[1], 10);
        const statusText = statusMatch[2];
        
        // Parse headers
        const headers: Record<string, string> = {};
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          if (line === '') break; // End of headers
          
          const colonIndex = line.indexOf(':');
          if (colonIndex > 0) {
            const key = line.substring(0, colonIndex).trim().toLowerCase();
            const value = line.substring(colonIndex + 1).trim();
            headers[key] = value;
          }
        }
        
        this._response = { status, statusText, headers };
        
        // Check for content-length
        const contentLengthHeader = headers['content-length'];
        if (contentLengthHeader) {
          this._contentLength = parseInt(contentLengthHeader, 10);
        }
        
        this._headersParsed = true;
        // Calculate how much body data we already have
        const remainingData = combined.slice(headerBytes.length);
        this._bodyReceived = remainingData.length;
      } catch (error) {
        // Headers not complete yet
      }
    }
  }

  isComplete(): boolean {
    if (!this._headersParsed || !this._response) {
      return false;
    }
    
    if (this._contentLength !== null) {
      return this._bodyReceived >= this._contentLength;
    }
    
    // If no content-length, we can't determine completion
    // In real implementation, you'd need to handle chunked encoding
    return false;
  }

  getResponse(): HttpResponse | null {
    if (!this.isComplete() || !this._response) {
      return null;
    }
    
    // Combine all chunks
    const combined = new Uint8Array(this._totalLength);
    let offset = 0;
    for (const chunk of this._chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }
    
    // Parse again to get the body
    const fullResponse = parseHttpResponse(combined);
    
    return {
      status: this._response.status!,
      statusText: this._response.statusText!,
      headers: this._response.headers!,
      body: fullResponse.body
    };
  }
}