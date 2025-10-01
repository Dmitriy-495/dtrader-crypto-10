import WebSocket from "ws";

export class GateIOWebSocket {
  private ws: WebSocket | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private isConnected: boolean = false;
  private onPongCallback: ((data: any) => void) | null = null;

  private readonly GATE_IO_WS_URL = "wss://ws.gate.io/v4/";
  private readonly PING_INTERVAL = 30000;

  constructor(onPong: (data: any) => void) {
    this.onPongCallback = onPong;
  }

  public connect(): void {
    this.ws = new WebSocket(this.GATE_IO_WS_URL);

    this.ws.on("open", () => {
      this.isConnected = true;
      this.startPingInterval();
    });

    this.ws.on("message", (data: Buffer) => {
      const message = JSON.parse(data.toString());

      if (message.result === "pong" && this.onPongCallback) {
        this.onPongCallback({
          id: message.id,
          timestamp: Date.now(),
          serverTime: message.result.time || Math.floor(Date.now() / 1000),
        });
      }
    });

    this.ws.on("close", () => {
      this.isConnected = false;
      this.cleanup();
      setTimeout(() => this.connect(), 5000);
    });

    this.ws.on("error", () => {});
  }

  private startPingInterval(): void {
    this.sendPing();
    this.pingInterval = setInterval(() => this.sendPing(), this.PING_INTERVAL);
  }

  private sendPing(): void {
    if (this.ws && this.isConnected) {
      const pingMessage = {
        id: Math.floor(Date.now() / 1000),
        method: "server.ping",
      };
      this.ws.send(JSON.stringify(pingMessage));
    }
  }

  private cleanup(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  public disconnect(): void {
    this.cleanup();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }

  public getConnectionStatus(): boolean {
    return this.isConnected;
  }
}
