import { GateIOWebSocket } from "./gateio-websocket";
import { ClientWebSocketServer } from "./client-websocket";
import { EventBus } from "./event-bus";
import { SystemStatus } from "./types";

export class DTraderCrypto {
  private gateIO: GateIOWebSocket;
  private clientWS: ClientWebSocketServer;
  private eventBus: EventBus;
  private isRunning: boolean = false;
  private coreLoop: NodeJS.Timeout | null = null;
  private lastPongTime: number = 0;
  private startupTime: number = 0;

  constructor() {
    this.eventBus = EventBus.getInstance();
    this.gateIO = new GateIOWebSocket();
    this.clientWS = new ClientWebSocketServer(8080);

    this.setupEventListeners();
  }

  public async start(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    this.startupTime = Date.now();

    console.log("🎯 dtrader-crypto core starting...");
    console.log("⏰ Startup time:", new Date(this.startupTime).toISOString());

    this.gateIO.connect();
    this.startCoreLoop();

    this.eventBus.emit("system_started", {
      timestamp: this.startupTime,
    });

    console.log("✅ dtrader-crypto core started successfully");
  }

  public stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;

    if (this.coreLoop) {
      clearInterval(this.coreLoop);
      this.coreLoop = null;
    }

    this.gateIO.disconnect();
    this.clientWS.close();

    const uptime = Date.now() - this.startupTime;
    console.log(
      `🛑 dtrader-crypto core stopped. Uptime: ${Math.round(uptime / 1000)}s`
    );
  }

  private startCoreLoop(): void {
    this.coreLoop = setInterval(() => {
      if (!this.isRunning) return;

      // Отправляем статус каждые 10 секунд
      if (Date.now() % 10000 < 1000) {
        this.sendSystemStatus();
      }
    }, 1000);

    console.log("🔁 Core monitoring loop started");
  }

  private sendSystemStatus(): void {
    const status: SystemStatus = {
      status: "connected",
      lastPong: this.lastPongTime,
      gateIOConnected: this.gateIO.getConnectionStatus(),
      clientsConnected: this.clientWS.getClientsCount(),
    };

    this.eventBus.emit("system_status", status);
  }

  private setupEventListeners(): void {
    this.eventBus.on("pong_received", (data: any) => {
      this.lastPongTime = data.timestamp;

      const pongTime = new Date(data.timestamp).toISOString();
      const latency = data.pingLatency ? `${data.pingLatency}ms` : "N/A";

      console.log("════════════════════════════════════════");
      console.log("📡 PONG RECEIVED FROM GATE.IO");
      console.log("════════════════════════════════════════");
      console.log(`   📅 Local time: ${pongTime}`);
      console.log(`   🔢 Time field: ${data.time}`);
      console.log(`   ⏱️  Latency: ${latency}`);
      console.log(`   📊 Clients: ${this.clientWS.getClientsCount()}`);
      console.log("════════════════════════════════════════");
    });

    this.eventBus.on("gateio_connected", () => {
      console.log("✅ Connected to Gate.io WebSocket");
      console.log("🔄 Ping-pong monitoring started (30s interval)");
    });

    this.eventBus.on("gateio_disconnected", () => {
      console.log("❌ Disconnected from Gate.io");
    });

    this.eventBus.on("ping_sent", (data: any) => {
      const pingTime = new Date(data.timestamp).toISOString();
      console.log("────────────────────────────────────────");
      console.log("📤 PING SENT TO GATE.IO");
      console.log("────────────────────────────────────────");
      console.log(`   📅 Time: ${pingTime}`);
      console.log(`   🔢 Time field: ${data.message.time}`);
      console.log("────────────────────────────────────────");
    });

    this.eventBus.on("client_connected", (data: any) => {
      console.log(`👤 Client connected. Total: ${data.clientsCount}`);
    });

    this.eventBus.on("client_disconnected", (data: any) => {
      console.log(`👤 Client disconnected. Total: ${data.clientsCount}`);
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

  public getUptime(): number {
    return this.isRunning ? Date.now() - this.startupTime : 0;
  }
}
