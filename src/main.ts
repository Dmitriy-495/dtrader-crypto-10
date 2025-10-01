import { DTraderCrypto } from "./core.js";

class DTraderServer {
  private dtrader: DTraderCrypto;

  constructor() {
    this.dtrader = new DTraderCrypto();
  }

  public async start(): Promise<void> {
    await this.dtrader.start();
  }

  public async shutdown(): Promise<void> {
    await this.dtrader.stop();
    process.exit(0);
  }
}

const server = new DTraderServer();

process.on("SIGINT", () => server.shutdown());
process.on("SIGTERM", () => server.shutdown());
process.on("uncaughtException", () => process.exit(1));
process.on("unhandledRejection", () => process.exit(1));

server.start();
