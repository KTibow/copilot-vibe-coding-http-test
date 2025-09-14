/**
 * Wisp Protocol Constants and Types
 */

// Packet types according to Wisp v1.2 specification
export const enum PacketType {
  CONNECT = 0x01,
  DATA = 0x02,
  CONTINUE = 0x03,
  CLOSE = 0x04
}

// Stream types
export const enum StreamType {
  TCP = 0x01,
  UDP = 0x02
}

// Close reasons
export const enum CloseReason {
  // Client/Server reasons
  UNSPECIFIED = 0x01,
  VOLUNTARY = 0x02,
  NETWORK_ERROR = 0x03,
  
  // Server only reasons
  INVALID_INFO = 0x41,
  UNREACHABLE_HOST = 0x42,
  TIMEOUT = 0x43,
  CONNECTION_REFUSED = 0x44,
  DATA_TIMEOUT = 0x47,
  BLOCKED = 0x48,
  THROTTLED = 0x49,
  
  // Client only reasons
  CLIENT_ERROR = 0x81
}

export interface WispPacket {
  type: PacketType;
  streamId: number;
  payload: Uint8Array;
}

export interface ConnectPayload {
  streamType: StreamType;
  port: number;
  hostname: string;
}

export interface ContinuePayload {
  bufferRemaining: number;
}

export interface ClosePayload {
  reason: CloseReason;
}