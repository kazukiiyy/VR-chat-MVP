export interface ResponseMessage {
  type: 'response';
  comment: { author: string; text: string };
  reply: string;
  emotion: string;
  voice_style: string;
  audio: string;
}

type MessageHandler = (msg: ResponseMessage) => void;
type ConnectionHandler = (connected: boolean) => void;

export class VTuberWebSocket {
  private socket: WebSocket | null = null;
  private messageHandlers = new Set<MessageHandler>();
  private connectionHandlers = new Set<ConnectionHandler>();

  connect(url: string): void {
    this.disconnect();

    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      this.emitConnection(true);
    };

    this.socket.onmessage = (event: MessageEvent) => {
      try {
        const parsed = JSON.parse(String(event.data)) as ResponseMessage;
        if (parsed.type === 'response') {
          this.messageHandlers.forEach((handler) => handler(parsed));
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message', error);
      }
    };

    this.socket.onerror = (event) => {
      console.error('WebSocket error', event);
      this.emitConnection(false);
    };

    this.socket.onclose = () => {
      this.emitConnection(false);
    };
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.emitConnection(false);
  }

  onMessage(handler: MessageHandler): void {
    this.messageHandlers.add(handler);
  }

  offMessage(handler: MessageHandler): void {
    this.messageHandlers.delete(handler);
  }

  onConnectionChange(handler: ConnectionHandler): void {
    this.connectionHandlers.add(handler);
  }

  offConnectionChange(handler: ConnectionHandler): void {
    this.connectionHandlers.delete(handler);
  }

  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  private emitConnection(connected: boolean): void {
    this.connectionHandlers.forEach((handler) => handler(connected));
  }
}
