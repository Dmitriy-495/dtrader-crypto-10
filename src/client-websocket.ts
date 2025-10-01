import WebSocket from "ws";
import { EventBus } from "./event-bus";
import { WebSocketMessage, SystemStatus } from "./types";

export class ClientWebSocketServer {
  private wss: WebSocket.Server;
  private eventBus: EventBus;
  private clients: Set<WebSocket> = new Set();

  constructor(port: number = 8080) {
    this.wss = new WebSocket.Server({ port });
    this.eventBus = EventBus.getInstance();

    this.setupWebSocketServer();
    this.setupEventBusListeners();

    console.log(`🌐 Client WebSocket server started on port ${port}`);
  }

  private setupWebSocketServer(): void {
    this.wss.on("connection", (ws: WebSocket) => {
      this.handleNewConnection(ws);
    });

    this.wss.on("error", (error: Error) => {
      console.log("❌ Client WebSocket server error:", error.message);
    });
  }

  private handleNewConnection(ws: WebSocket): void {
    this.clients.add(ws);

    const clientsCount = this.clients.size;
    console.log(`👤 New client connected. Total: ${clientsCount}`);

    this.eventBus.emit("client_connected", {
      clientsCount,
    });

    const welcomeMessage: WebSocketMessage = {
      type: "welcome",
      data: {
        message: "Connected to dtrader-crypto server",
        version: "10.0.0",
      },
      timestamp: Date.now(),
    };
    this.sendToClient(ws, welcomeMessage);

    ws.on("message", (data: Buffer) => {
      this.handleClientMessage(ws, data.toString());
    });

    ws.on("close", () => {
      this.handleClientDisconnect(ws);
    });

    ws.on("error", (error: Error) => {
      this.handleClientError(ws, error);
    });
  }

  private handleClientMessage(ws: WebSocket, data: string): void {
    try {
      const message: WebSocketMessage = JSON.parse(data);

      switch (message.type) {
        case "get_status":
          this.eventBus.emit("get_status", { ws });
          break;
        case "ping":
          this.sendToClient(ws, {
            type: "pong",
            data: { serverTime: Date.now() },
            timestamp: Date.now(),
          });
          break;
      }
    } catch (error) {
      this.sendToClient(ws, {
        type: "error",
        data: { message: "Invalid message format" },
        timestamp: Date.now(),
      });
    }
  }

  private handleClientDisconnect(ws: WebSocket): void {
    this.clients.delete(ws);
    const clientsCount = this.clients.size;

    console.log(`👤 Client disconnected. Total: ${clientsCount}`);

    this.eventBus.emit("client_disconnected", {
      clientsCount,
    });
  }

  private handleClientError(ws: WebSocket, error: Error): void {
    this.clients.delete(ws);
    console.log("❌ Client error:", error.message);
  }

  private setupEventBusListeners(): void {
    this.eventBus.on("gateio_connected", (data: any) => {
      this.broadcast({
        type: "gateio_status",
        data: { connected: true, ...data },
        timestamp: Date.now(),
      });
    });

    this.eventBus.on("gateio_disconnected", (data: any) => {
      this.broadcast({
        type: "gateio_status",
        data: { connected: false, ...data },
        timestamp: Date.now(),
      });
    });

    this.eventBus.on("ping_sent", (data: any) => {
      this.broadcast({
        type: "ping_sent",
        data: data,
        timestamp: Date.now(),
      });
    });

    this.eventBus.on("pong_received", (data: any) => {
      this.broadcast({
        type: "pong_received",
        data: data,
        timestamp: Date.now(),
      });
    });

    this.eventBus.on("system_status", (data: SystemStatus) => {
      this.broadcast({
        type: "system_status",
        data: data,
        timestamp: Date.now(),
      });
    });
  }

  private sendToClient(ws: WebSocket, message: WebSocketMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {}
    }
  }

  private broadcast(message: WebSocketMessage): void {
    const messageStr = JSON.stringify(message);

    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(messageStr);
        } catch (error) {}
      }
    });
  }

  public getClientsCount(): number {
    return this.clients.size;
  }

  public close(): void {
    console.log("👋 Closing client WebSocket server...");

    this.broadcast({
      type: "server_shutdown",
      data: { message: "Server is shutting down" },
      timestamp: Date.now(),
    });

    this.clients.forEach((client) => {
      client.close();
    });
    this.clients.clear();

    this.wss.close();
  }
}
