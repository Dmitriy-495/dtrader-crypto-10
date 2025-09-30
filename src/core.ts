import { GateIOWebSocket } from "./gateio-websocket.js";
import { ClientWebSocketServer } from "./client-websocket.js";
import { EventBus } from "./event-bus.js";
import { SystemStatus } from "./types.js";

/**
 * Основное ядро системы dtrader-crypto
 * Координирует работу всех компонентов и управляет жизненным циклом
 */
export class DTraderCrypto {
  private gateIO: GateIOWebSocket;
  private clientWS: ClientWebSocketServer;
  private eventBus: EventBus;
  private isRunning: boolean = false;
  private coreLoop: NodeJS.Timeout | null = null;
  private lastPongTime: number = 0;
  private startupTime: number = 0;

  // Стандартные каналы для подписки
  private readonly DEFAULT_CHANNELS = [
    "spot.tickers",
    "spot.trades",
    "spot.order_book",
  ];

  constructor() {
    this.eventBus = EventBus.getInstance();
    this.gateIO = new GateIOWebSocket();
    this.clientWS = new ClientWebSocketServer(8080);

    this.setupEventListeners();
  }

  /**
   * Запуск системы
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.startupTime = Date.now();

    // Запускаем подключение к бирже
    this.gateIO.connect();

    // Запускаем основной цикл системы
    this.startCoreLoop();

    this.eventBus.emit("system_started", {
      timestamp: this.startupTime,
      port: 8080,
      version: "10.0.0",
    });
  }

  /**
   * Остановка системы
   */
  public stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    // Останавливаем основной цикл
    if (this.coreLoop) {
      clearInterval(this.coreLoop);
      this.coreLoop = null;
    }

    // Закрываем соединения
    this.gateIO.disconnect();
    this.clientWS.close();

    const uptime = Date.now() - this.startupTime;

    this.eventBus.emit("system_stopped", {
      timestamp: Date.now(),
      uptime,
    });
  }

  /**
   * Запуск основного цикла системы
   */
  private startCoreLoop(): void {
    // Основной цикл с интервалом 1 секунда для мониторинга
    this.coreLoop = setInterval(() => {
      if (!this.isRunning) return;

      // Отправка статуса системы
      this.sendSystemStatus();

      // Дополнительные проверки здоровья системы могут быть добавлены здесь
    }, 1000);
  }

  /**
   * Отправка статуса системы всем клиентам
   */
  private sendSystemStatus(): void {
    const status: SystemStatus = {
      status: "connected",
      lastPong: this.lastPongTime,
      gateIOConnected: this.gateIO.getConnectionStatus(),
      clientsConnected: this.clientWS.getClientsCount(),
    };

    this.eventBus.emit("system_status", status);
  }

  /**
   * Настройка обработчиков событий
   */
  private setupEventListeners(): void {
    // Обработка pong от Gate.io
    this.eventBus.on("pong_received", (data: any) => {
      this.lastPongTime = data.timestamp;
    });

    // При подключении к Gate.io подписываемся на каналы
    this.eventBus.on("gateio_connected", () => {
      setTimeout(() => {
        this.eventBus.emit("subscribe", {
          channels: this.DEFAULT_CHANNELS,
        });
      }, 1000);
    });

    // Обработка запроса статуса от клиента
    this.eventBus.on("system_status_request", (data: { ws: WebSocket }) => {
      const status = this.getStatus();
      this.eventBus.emit("system_status", status);
    });

    // Обработка критических ошибок
    this.eventBus.on("gateio_error", (data: any) => {
      // В будущем здесь может быть логика обработки критических ошибок
    });

    // Обработка максимального количества переподключений
    this.eventBus.on("gateio_max_reconnects", (data: any) => {
      // Система может принять решение об остановке при постоянных ошибках подключения
      this.eventBus.emit("system_error", {
        code: "MAX_RECONNECTS",
        message: "Maximum reconnection attempts reached",
        timestamp: Date.now(),
      });
    });
  }

  /**
   * Получение текущего статуса системы
   */
  public getStatus(): SystemStatus {
    return {
      status: this.isRunning ? "connected" : "disconnected",
      lastPong: this.lastPongTime,
      gateIOConnected: this.gateIO.getConnectionStatus(),
      clientsConnected: this.clientWS.getClientsCount(),
    };
  }

  /**
   * Проверка работы системы
   */
  public isSystemRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Получение времени работы системы
   */
  public getUptime(): number {
    return this.isRunning ? Date.now() - this.startupTime : 0;
  }
}
