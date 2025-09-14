// Main exports for the Wisp HTTP Client library
export { WispClient, WispStream } from './wisp-client.js';
export { WispHttpClient, createFetch } from './wisp-http-client.js';
export type { WispHttpClientConfig, RequestOptions } from './wisp-http-client.js';
export type { HttpRequest, HttpResponse } from './http.js';
export { formatHttpRequest, parseHttpResponse, HttpResponseCollector } from './http.js';
export { 
  PacketType, 
  StreamType, 
  CloseReason 
} from './wisp-types.js';

// Re-export types for consumers
export type { 
  WispPacket, 
  ConnectPayload, 
  ContinuePayload, 
  ClosePayload 
} from './wisp-types.js';