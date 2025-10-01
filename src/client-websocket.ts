import WebSocket from 'ws';
import { WebSocketMessage, SystemStatus } from './types.js';

export class ClientWebSocketServer {
  private wss: WebSocket.Server;
  private clients: Set<WebSocket> = new Set();
  private onStatusCallback: (() => SystemStatus) | null = null;

  constructor(port: number = 28080, onStatus: () => SystemStatus) {
    this.wss = new WebSocket.Server({ port });
    this.onStatusCallback = onStatus;
    this.setupWebSocketServer();
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      this.clients.add(ws);

      this.sendToClient(ws, {
        type: 'welcome',
        data: { message: 'Connected to dtrader-crypto server', version: '10.0.0' },
        timestamp: Date.now()
      });

      ws.on('message', (data: Buffer) => {
        this.handleClientMessage(ws, data.toString());
      });

      ws.on('close', () => {
        this.clients.delete(ws);
      });

      ws.on('error', () => {
        this.clients.delete(ws);
      });
    });
  }

  private handleClientMessage(ws: WebSocket, data: string): void {
    try {
      const message: WebSocketMessage = JSON.parse(data);
      
      if (message.type === 'get_status' && this.onStatusCallback) {
        const status = this.onStatusCallback();
        this.sendToClient(ws, {
          type: 'system_status',
          data: status,
          timestamp: Date.now()
        });
      }
    } catch (error) {}
  }

  private sendToClient(ws: WebSocket, message: WebSocketMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  public broadcast(message: WebSocketMessage): void {
    const messageStr = JSON.stringify(message);
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }

  public getClientsCount(): number {
    return this.clients.size;
  }

  public close(): void {
    this.clients.forEach(client => client.close());
    this.clients.clear();
    this.wss.close();
  }
}