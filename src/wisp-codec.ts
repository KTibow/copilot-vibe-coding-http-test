import { WispPacket, PacketType, ConnectPayload, ContinuePayload, ClosePayload, CloseReason } from './wisp-types.js';

/**
 * Utility functions for encoding/decoding Wisp protocol packets
 */

export function encodePacket(packet: WispPacket): Uint8Array {
  const payloadLength = packet.payload.length;
  const buffer = new Uint8Array(5 + payloadLength); // 1 + 4 + payload
  const view = new DataView(buffer.buffer);
  
  // Packet type (uint8)
  view.setUint8(0, packet.type);
  
  // Stream ID (uint32, little-endian)
  view.setUint32(1, packet.streamId, true);
  
  // Payload
  buffer.set(packet.payload, 5);
  
  return buffer;
}

export function decodePacket(data: Uint8Array): WispPacket {
  if (data.length < 5) {
    throw new Error('Invalid packet: too short');
  }
  
  const view = new DataView(data.buffer, data.byteOffset);
  
  return {
    type: view.getUint8(0) as PacketType,
    streamId: view.getUint32(1, true),
    payload: data.slice(5)
  };
}

export function encodeConnectPayload(payload: ConnectPayload): Uint8Array {
  const hostnameBytes = new TextEncoder().encode(payload.hostname);
  const buffer = new Uint8Array(3 + hostnameBytes.length); // 1 + 2 + hostname
  const view = new DataView(buffer.buffer);
  
  // Stream type (uint8)
  view.setUint8(0, payload.streamType);
  
  // Port (uint16, little-endian)
  view.setUint16(1, payload.port, true);
  
  // Hostname
  buffer.set(hostnameBytes, 3);
  
  return buffer;
}

export function decodeContinuePayload(data: Uint8Array): ContinuePayload {
  if (data.length < 4) {
    throw new Error('Invalid CONTINUE payload');
  }
  
  const view = new DataView(data.buffer, data.byteOffset);
  return {
    bufferRemaining: view.getUint32(0, true)
  };
}

export function encodeClosePayload(payload: ClosePayload): Uint8Array {
  const buffer = new Uint8Array(1);
  buffer[0] = payload.reason;
  return buffer;
}

export function decodeClosePayload(data: Uint8Array): ClosePayload {
  if (data.length < 1) {
    throw new Error('Invalid CLOSE payload');
  }
  
  return {
    reason: data[0] as CloseReason
  };
}