import { 
  PacketType, 
  StreamType, 
  CloseReason, 
  WispPacket, 
  ConnectPayload
} from './wisp-types.js';
import { 
  encodePacket, 
  decodePacket, 
  encodeConnectPayload, 
  decodeContinuePayload,
  decodeClosePayload 
} from './wisp-codec.js';

/**
 * Represents a single TCP stream over a Wisp connection
 */
class WispStream extends EventTarget {
  private _streamId: number;
  private _client: WispClient;
  private _bufferRemaining: number = 0;
  private _closed: boolean = false;

  constructor(streamId: number, client: WispClient) {
    super();
    this._streamId = streamId;
    this._client = client;
  }

  get streamId(): number {
    return this._streamId;
  }

  get closed(): boolean {
    return this._closed;
  }

  send(data: Uint8Array): boolean {
    if (this._closed) {
      throw new Error('Stream is closed');
    }

    if (this._bufferRemaining <= 0) {
      return false; // Would block
    }

    this._client._sendData(this._streamId, data);
    this._bufferRemaining--;
    return true;
  }

  close(reason: CloseReason = CloseReason.VOLUNTARY): void {
    if (this._closed) return;
    
    this._closed = true;
    this._client._closeStream(this._streamId, reason);
  }

  _handleData(data: Uint8Array): void {
    this.dispatchEvent(new CustomEvent('data', { detail: data }));
  }

  _handleContinue(bufferRemaining: number): void {
    this._bufferRemaining = bufferRemaining;
    this.dispatchEvent(new CustomEvent('continue', { detail: bufferRemaining }));
  }

  _handleClose(reason: CloseReason): void {
    this._closed = true;
    this.dispatchEvent(new CustomEvent('close', { detail: reason }));
  }
}

/**
 * Wisp client for creating and managing TCP streams over WebSocket
 */
export class WispClient extends EventTarget {
  private _ws: WebSocket | null = null;
  private _url: string;
  private _streams: Map<number, WispStream> = new Map();
  private _nextStreamId: number = 1;
  private _ready: boolean = false;

  constructor(url: string) {
    super();
    this._url = url.endsWith('/') ? url : url + '/';
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this._ws = new WebSocket(this._url);
      this._ws.binaryType = 'arraybuffer';

      this._ws.onopen = () => {
        // Wait for initial CONTINUE packet (stream ID 0)
        // This sets the global buffer size
      };

      this._ws.onmessage = (event) => {
        try {
          const packet = decodePacket(new Uint8Array(event.data));
          this._handlePacket(packet);
          
          if (!this._ready && packet.type === PacketType.CONTINUE && packet.streamId === 0) {
            this._ready = true;
            resolve();
          }
        } catch (error) {
          this.dispatchEvent(new CustomEvent('error', { detail: error }));
        }
      };

      this._ws.onclose = () => {
        this._ready = false;
        this.dispatchEvent(new CustomEvent('close'));
      };

      this._ws.onerror = () => {
        reject(new Error('WebSocket connection failed'));
      };
    });
  }

  createStream(hostname: string, port: number): WispStream {
    if (!this._ready || !this._ws) {
      throw new Error('Client not connected');
    }

    const streamId = this._nextStreamId++;
    const stream = new WispStream(streamId, this);
    this._streams.set(streamId, stream);

    // Send CONNECT packet
    const connectPayload: ConnectPayload = {
      streamType: StreamType.TCP,
      port,
      hostname
    };

    const packet: WispPacket = {
      type: PacketType.CONNECT,
      streamId,
      payload: encodeConnectPayload(connectPayload)
    };

    this._ws.send(encodePacket(packet));

    return stream;
  }

  _sendData(streamId: number, data: Uint8Array): void {
    if (!this._ws) return;

    const packet: WispPacket = {
      type: PacketType.DATA,
      streamId,
      payload: data
    };

    this._ws.send(encodePacket(packet));
  }

  _closeStream(streamId: number, reason: CloseReason): void {
    if (!this._ws) return;

    const packet: WispPacket = {
      type: PacketType.CLOSE,
      streamId,
      payload: new Uint8Array([reason])
    };

    this._ws.send(encodePacket(packet));
    this._streams.delete(streamId);
  }

  private _handlePacket(packet: WispPacket): void {
    const stream = this._streams.get(packet.streamId);

    switch (packet.type) {
      case PacketType.DATA:
        if (stream) {
          stream._handleData(packet.payload);
        }
        break;

      case PacketType.CONTINUE:
        if (packet.streamId !== 0 && stream) {
          const continuePayload = decodeContinuePayload(packet.payload);
          stream._handleContinue(continuePayload.bufferRemaining);
        }
        break;

      case PacketType.CLOSE:
        if (stream) {
          const closePayload = decodeClosePayload(packet.payload);
          stream._handleClose(closePayload.reason);
          this._streams.delete(packet.streamId);
        }
        break;
    }
  }

  close(): void {
    if (this._ws) {
      this._ws.close();
      this._ws = null;
    }
    this._streams.clear();
    this._ready = false;
  }

  get ready(): boolean {
    return this._ready;
  }
}

export { WispStream };