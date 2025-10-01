export class GateIOWebSocket {
  // Пробуем разные endpoints
  private readonly GATE_IO_WS_URLS = [
    "wss://ws.gate.io/v4/",
    "wss://api.gateio.ws/ws/v4/",
    "wss://fx-ws.gateio.ws/v4/ws/usdt",
  ];

  private currentUrlIndex = 0;

  private getCurrentUrl(): string {
    return this.GATE_IO_WS_URLS[this.currentUrlIndex];
  }

  public connect(): void {
    try {
      const url = this.getCurrentUrl();
      console.log(`🔗 Connecting to Gate.io WebSocket: ${url}`);

      this.ws = new WebSocket(url);
      // ... остальной код тот же
    } catch (error) {
      console.log("❌ Connection error:", error);
      this.rotateUrlAndReconnect();
    }
  }

  private rotateUrlAndReconnect(): void {
    this.currentUrlIndex =
      (this.currentUrlIndex + 1) % this.GATE_IO_WS_URLS.length;
    console.log(`🔄 Rotating to next URL: ${this.getCurrentUrl()}`);

    setTimeout(() => {
      this.connect();
    }, 5000);
  }
}
