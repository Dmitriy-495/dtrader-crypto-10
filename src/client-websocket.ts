import WebSocket from "ws";
import { EventBus } from "./event-bus.js";
import { WebSocketMessage, SystemStatus } from "./types.js";

/**
 * WebSocket сервер для подключения клиентов
 * Обеспечивает двустороннюю связь с клиентскими приложениями
 */
export class ClientWebSocketServer {
  private wss: WebSocket.Server;
  private eventBus: EventBus;
  private clients: Set<WebSocket> = new Set();

  constructor(port: number = 8080) {
    this.wss = new WebSocket.Server({
      port,
      // Автоматическое удаление отключенных клиентов
      clientTracking: true,
    });

    this.eventBus = EventBus.getInstance();

    this.setupWebSocketServer();
    this.setupEventBusListeners();
  }

  /**
   * Настройка WebSocket сервера
   */
  private setupWebSocketServer(): void {
    // Обработка новых подключений
    this.wss.on("connection", (ws: WebSocket) => {
      this.handleNewConnection(ws);
    });

    // Обработка ошибок сервера
    this.wss.on("error", (error: Error) => {
      this.eventBus.emit("client_ws_error", {
        error: error.message,
        timestamp: Date.now(),
      });
    });

    this.eventBus.emit("client_ws_started", {
      port: 8080,
      timestamp: Date.now(),
    });
  }

  /**
   * Обработка нового подключения клиента
   */
  private handleNewConnection(ws: WebSocket): void {
    this.clients.add(ws);

    const clientsCount = this.clients.size;
    this.eventBus.emit("client_connected", {
      clientsCount,
      timestamp: Date.now(),
    });

    // Отправка приветственного сообщения
    const welcomeMessage: WebSocketMessage = {
      type: "welcome",
      data: {
        message: "Connected to dtrader-crypto server",
        version: "10.0.0",
        serverTime: Date.now(),
      },
      timestamp: Date.now(),
    };
    this.sendToClient(ws, welcomeMessage);

    // Обработка сообщений от клиента
    ws.on("message", (data: Buffer) => {
      this.handleClientMessage(ws, data.toString());
    });

    // Обработка отключения клиента
    ws.on("close", (code: number, reason: Buffer) => {
      this.handleClientDisconnect(ws, code, reason);
    });

    // Обработка ошибок клиента
    ws.on("error", (error: Error) => {
      this.handleClientError(ws, error);
    });
  }

  /**
   * Обработка сообщений от клиента
   */
  private handleClientMessage(ws: WebSocket, data: string): void {
    try {
      const message: WebSocketMessage = JSON.parse(data);

      switch (message.type) {
        case "subscribe":
          this.eventBus.emit("subscribe", message.data);
          break;

        case "unsubscribe":
          this.eventBus.emit("unsubscribe", message.data);
          break;

        case "get_status":
          this.eventBus.emit("get_status", { ws });
          break;

        case "ping":
          // Ответ на ping от клиента
          this.sendToClient(ws, {
            type: "pong",
            data: { serverTime: Date.now() },
            timestamp: Date.now(),
          });
          break;

        default:
          // Пересылка неизвестных команд в систему
          this.eventBus.emit("client_command", {
            ws,
            command: message.type,
            data: message.data,
          });
      }
    } catch (error) {
      // Отправка ошибки формата клиенту
      this.sendToClient(ws, {
        type: "error",
        data: {
          message: "Invalid message format",
          code: "INVALID_FORMAT",
        },
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Обработка отключения клиента
   */
  private handleClientDisconnect(
    ws: WebSocket,
    code: number,
    reason: Buffer
  ): void {
    this.clients.delete(ws);

    this.eventBus.emit("client_disconnected", {
      clientsCount: this.clients.size,
      code,
      reason: reason.toString(),
      timestamp: Date.now(),
    });
  }

  /**
   * Обработка ошибок клиента
   */
  private handleClientError(ws: WebSocket, error: Error): void {
    this.clients.delete(ws);

    this.eventBus.emit("client_error", {
      error: error.message,
      clientsCount: this.clients.size,
      timestamp: Date.now(),
    });
  }

  /**
   * Настройка слушателей событий для рассылки клиентам
   */
  private setupEventBusListeners(): void {
    // Статус Gate.io
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

    // Ping/Pong события
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

    // Статус системы
    this.eventBus.on("system_status", (data: SystemStatus) => {
      this.broadcast({
        type: "system_status",
        data: data,
        timestamp: Date.now(),
      });
    });

    // Данные от Gate.io
    this.eventBus.on("gateio_message", (data: any) => {
      this.broadcast({
        type: "market_data",
        data: data,
        timestamp: Date.now(),
      });
    });

    // Ответ на запрос статуса
    this.eventBus.on("get_status", (data: { ws: WebSocket }) => {
      this.eventBus.emit("system_status_request", { ws: data.ws });
    });
  }

  /**
   * Отправка сообщения конкретному клиенту
   */
  private sendToClient(ws: WebSocket, message: WebSocketMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        // Игнорируем ошибки отправки
      }
    }
  }

  /**
   * Широковещательная рассылка всем подключенным клиентам
   */
  private broadcast(message: WebSocketMessage): void {
    const messageStr = JSON.stringify(message);

    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(messageStr);
        } catch (error) {
          // Игнорируем ошибки отправки, клиент будет удален при следующем обновлении
        }
      }
    });
  }

  /**
   * Получение количества подключенных клиентов
   */
  public getClientsCount(): number {
    return this.clients.size;
  }

  /**
   * Закрытие сервера
   */
  public close(): void {
    // Уведомление клиентов о закрытии
    this.broadcast({
      type: "server_shutdown",
      data: { message: "Server is shutting down" },
      timestamp: Date.now(),
    });

    // Закрытие соединений
    this.clients.forEach((client) => {
      client.close();
    });
    this.clients.clear();

    // Закрытие сервера
    this.wss.close();
  }
}
