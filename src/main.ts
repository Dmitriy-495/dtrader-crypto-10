import { DTraderCrypto } from "./core.js";

/**
 * Главный класс сервера dtrader-crypto
 * Точка входа приложения, управляет жизненным циклом
 */
class DTraderServer {
  private dtrader: DTraderCrypto;

  constructor() {
    this.dtrader = new DTraderCrypto();
    console.log("🚀 dtrader-crypto server v10.0.0 initializing...");
  }

  /**
   * Запуск сервера
   */
  public async start(): Promise<void> {
    try {
      await this.dtrader.start();
      console.log("✅ dtrader-crypto server started successfully!");
      console.log("📍 Client WebSocket available on port 8080");
      console.log("🔗 Gate.io connection established");
    } catch (error) {
      console.log("❌ Failed to start server:", error);
      process.exit(1);
    }
  }

  /**
   * Грациозное завершение работы
   */
  public async shutdown(): Promise<void> {
    console.log("🛑 Shutting down dtrader-crypto server...");
    await this.dtrader.stop();
    console.log("👋 Server stopped gracefully");
    process.exit(0);
  }
}

// Создание и запуск сервера
const server = new DTraderServer();

// Обработка сигналов завершения работы
process.on("SIGINT", () => {
  console.log("\n📋 Received SIGINT signal");
  server.shutdown();
});

process.on("SIGTERM", () => {
  console.log("\n📋 Received SIGTERM signal");
  server.shutdown();
});

// Обработка необработанных исключений
process.on("uncaughtException", (error: Error) => {
  console.log("💥 Uncaught Exception:", error.message);
  process.exit(1);
});

process.on("unhandledRejection", (reason: any, promise: Promise<any>) => {
  console.log("💥 Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Запуск сервера
server.start();
