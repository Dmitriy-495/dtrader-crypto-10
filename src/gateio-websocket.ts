import WebSocket from "ws";
import { EventBus } from "./event-bus.js";
import { PingPongMessage } from "./types.js";

/**
 * Клиент WebSocket для подключения к бирже Gate.io
 * Обеспечивает устойчивое соединение с автоматическим переподключением
 */
export class GateIOWebSocket {
  private ws: WebSocket | null = null;
  private eventBus: EventBus;
  private pingInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;

  // Конфигурация подключения
  private readonly GATE_IO_WS_URL = "wss://ws.gate.io/v4/";
  private readonly PING_INTERVAL = 30000; // 30 секунд
  private readonly RECONNECT_DELAY = 5000; // 5 секунд

  constructor() {
    this.eventBus = EventBus.getInstance();
    this.setupEventBusListeners();
  }

  /**
   * Подключение к Gate.io WebSocket
   */
  public connect(): void {
    try {
      this.ws = new WebSocket(this.GATE_IO_WS_URL);

      this.ws.on("open", () => this.handleOpen());
      this.ws.on("message", (data: Buffer) => this.handleMessage(data));
      this.ws.on("close", (code: number, reason: Buffer) =>
        this.handleClose(code, reason)
      );
      this.ws.on("error", (error: Error) => this.handleError(error));
    } catch (error) {
      this.eventBus.emit("gateio_error", {
        error: (error as Error).message,
        context: "connect",
      });
    }
  }

  /**
   * Обработчик успешного подключения
   */
  private handleOpen(): void {
    this.isConnected = true;
    this.reconnectAttempts = 0; // Сбрасываем счетчик переподключений

    this.eventBus.emit("gateio_connected", {
      timestamp: Date.now(),
      reconnectAttempts: this.reconnectAttempts,
    });

    this.startPingInterval();
  }

  /**
   * Обработчик входящих сообщений
   */
  private handleMessage(data: Buffer): void {
    try {
      const message = JSON.parse(data.toString());

      // Обработка pong-сообщений
      if (message.channel === "spot.pong") {
        this.eventBus.emit("pong_received", {
          time: message.time,
          timestamp: Date.now(),
          serverTime: message.result?.time,
        });
        return;
      }

      // Пересылаем все остальные сообщения в систему
      this.eventBus.emit("gateio_message", message);
    } catch (error) {
      // Игнорируем некорректные JSON сообщения
    }
  }

  /**
   * Обработчик закрытия соединения
   */
  private handleClose(code: number, reason: Buffer): void {
    this.isConnected = false;
    this.eventBus.emit("gateio_disconnected", {
      timestamp: Date.now(),
      code,
      reason: reason.toString(),
    });

    this.cleanup();
    this.scheduleReconnect();
  }

  /**
   * Обработчик ошибок соединения
   */
  private handleError(error: Error): void {
    this.eventBus.emit("gateio_error", {
      error: error.message,
      context: "websocket",
      timestamp: Date.now(),
    });
  }

  /**
   * Запуск периодической отправки ping-сообщений
   */
  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      if (this.ws && this.isConnected) {
        const pingMessage: PingPongMessage = {
          time: Math.floor(Date.now() / 1000),
          channel: "spot.ping",
        };

        this.ws.send(JSON.stringify(pingMessage));
        this.eventBus.emit("ping_sent", {
          timestamp: Date.now(),
          message: pingMessage,
        });
      }
    }, this.PING_INTERVAL);
  }

  /**
   * Планирование переподключения с экспоненциальной задержкой
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.eventBus.emit("gateio_max_reconnects", {
        attempts: this.reconnectAttempts,
        timestamp: Date.now(),
      });
      return;
    }

    if (!this.reconnectTimeout) {
      const delay = this.RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts);
      this.reconnectTimeout = setTimeout(() => {
        this.reconnectAttempts++;
        this.reconnectTimeout = null;
        this.connect();
      }, delay);
    }
  }

  /**
   * Очистка ресурсов
   */
  private cleanup(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Настройка слушателей событий из системы
   */
  private setupEventBusListeners(): void {
    // Подписка на каналы
    this.eventBus.on("subscribe", (data: { channels: string[] }) => {
      this.subscribeToChannels(data.channels);
    });

    // Отписка от каналов
    this.eventBus.on("unsubscribe", (data: { channels: string[] }) => {
      this.unsubscribeFromChannels(data.channels);
    });
  }

  /**
   * Подписка на каналы рыночных данных
   */
  private subscribeToChannels(channels: string[]): void {
    if (this.ws && this.isConnected) {
      const subscribeMessage = {
        time: Math.floor(Date.now() / 1000),
        channel: "spot.subscribe",
        payload: channels,
      };
      this.ws.send(JSON.stringify(subscribeMessage));
    }
  }

  /**
   * Отписка от каналов
   */
  private unsubscribeFromChannels(channels: string[]): void {
    if (this.ws && this.isConnected) {
      const unsubscribeMessage = {
        time: Math.floor(Date.now() / 1000),
        channel: "spot.unsubscribe",
        payload: channels,
      };
      this.ws.send(JSON.stringify(unsubscribeMessage));
    }
  }

  /**
   * Отправка произвольного сообщения
   */
  public sendMessage(message: any): void {
    if (this.ws && this.isConnected) {
      this.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Разрыв соединения
   */
  public disconnect(): void {
    this.cleanup();

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.isConnected = false;
  }

  /**
   * Получение статуса соединения
   */
  public getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Получение количества попыток переподключения
   */
  public getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }
}
