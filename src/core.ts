import { GateIOWebSocket } from "./gateio-websocket.js";
import { ClientWebSocketServer } from "./client-websocket.js";
import { SystemStatus } from "./types.js";

export class DTraderCrypto {
  private gateIO: GateIOWebSocket;
  private clientWS: ClientWebSocketServer;
  private isRunning: boolean = false;
  private lastPongTime: number = 0;

  constructor() {
    this.clientWS = new ClientWebSocketServer(28080, () => this.getStatus());
    this.gateIO = new GateIOWebSocket((pongData) => this.handlePong(pongData));
  }

  public async start(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    this.gateIO.connect();

    setInterval(() => {
      if (this.isRunning) {
        this.clientWS.broadcast({
          type: "system_status",
          data: this.getStatus(),
          timestamp: Date.now(),
        });
      }
    }, 10000);
  }

  public stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    this.gateIO.disconnect();
    this.clientWS.close();
  }

  private handlePong(pongData: any): void {
    this.lastPongTime = pongData.timestamp;

    this.clientWS.broadcast({
      type: "pong_received",
      data: pongData,
      timestamp: Date.now(),
    });
  }

  public getStatus(): SystemStatus {
    return {
      status: this.isRunning ? "connected" : "disconnected",
      lastPong: this.lastPongTime,
      gateIOConnected: this.gateIO.getConnectionStatus(),
      clientsConnected: this.clientWS.getClientsCount(),
    };
  }
}
