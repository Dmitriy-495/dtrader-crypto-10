"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientWebSocketServer = void 0;
const ws_1 = __importDefault(require("ws"));
const event_bus_js_1 = require("./event-bus.js");
/**
 * WebSocket сервер для подключения клиентов
 * Обеспечивает двустороннюю связь с клиентскими приложениями
 */
class ClientWebSocketServer {
    wss;
    eventBus;
    clients = new Set();
    constructor(port = 8080) {
        this.wss = new ws_1.default.Server({
            port,
            // Автоматическое удаление отключенных клиентов
            clientTracking: true,
        });
        this.eventBus = event_bus_js_1.EventBus.getInstance();
        this.setupWebSocketServer();
        this.setupEventBusListeners();
    }
    /**
     * Настройка WebSocket сервера
     */
    setupWebSocketServer() {
        // Обработка новых подключений
        this.wss.on("connection", (ws) => {
            this.handleNewConnection(ws);
        });
        // Обработка ошибок сервера
        this.wss.on("error", (error) => {
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
    handleNewConnection(ws) {
        this.clients.add(ws);
        const clientsCount = this.clients.size;
        this.eventBus.emit("client_connected", {
            clientsCount,
            timestamp: Date.now(),
        });
        // Отправка приветственного сообщения
        const welcomeMessage = {
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
        ws.on("message", (data) => {
            this.handleClientMessage(ws, data.toString());
        });
        // Обработка отключения клиента
        ws.on("close", (code, reason) => {
            this.handleClientDisconnect(ws, code, reason);
        });
        // Обработка ошибок клиента
        ws.on("error", (error) => {
            this.handleClientError(ws, error);
        });
    }
    /**
     * Обработка сообщений от клиента
     */
    handleClientMessage(ws, data) {
        try {
            const message = JSON.parse(data);
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
        }
        catch (error) {
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
    handleClientDisconnect(ws, code, reason) {
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
    handleClientError(ws, error) {
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
    setupEventBusListeners() {
        // Статус Gate.io
        this.eventBus.on("gateio_connected", (data) => {
            this.broadcast({
                type: "gateio_status",
                data: { connected: true, ...data },
                timestamp: Date.now(),
            });
        });
        this.eventBus.on("gateio_disconnected", (data) => {
            this.broadcast({
                type: "gateio_status",
                data: { connected: false, ...data },
                timestamp: Date.now(),
            });
        });
        // Ping/Pong события
        this.eventBus.on("ping_sent", (data) => {
            this.broadcast({
                type: "ping_sent",
                data: data,
                timestamp: Date.now(),
            });
        });
        this.eventBus.on("pong_received", (data) => {
            this.broadcast({
                type: "pong_received",
                data: data,
                timestamp: Date.now(),
            });
        });
        // Статус системы
        this.eventBus.on("system_status", (data) => {
            this.broadcast({
                type: "system_status",
                data: data,
                timestamp: Date.now(),
            });
        });
        // Данные от Gate.io
        this.eventBus.on("gateio_message", (data) => {
            this.broadcast({
                type: "market_data",
                data: data,
                timestamp: Date.now(),
            });
        });
        // Ответ на запрос статуса
        this.eventBus.on("get_status", (data) => {
            this.eventBus.emit("system_status_request", { ws: data.ws });
        });
    }
    /**
     * Отправка сообщения конкретному клиенту
     */
    sendToClient(ws, message) {
        if (ws.readyState === ws_1.default.OPEN) {
            try {
                ws.send(JSON.stringify(message));
            }
            catch (error) {
                // Игнорируем ошибки отправки
            }
        }
    }
    /**
     * Широковещательная рассылка всем подключенным клиентам
     */
    broadcast(message) {
        const messageStr = JSON.stringify(message);
        this.clients.forEach((client) => {
            if (client.readyState === ws_1.default.OPEN) {
                try {
                    client.send(messageStr);
                }
                catch (error) {
                    // Игнорируем ошибки отправки, клиент будет удален при следующем обновлении
                }
            }
        });
    }
    /**
     * Получение количества подключенных клиентов
     */
    getClientsCount() {
        return this.clients.size;
    }
    /**
     * Закрытие сервера
     */
    close() {
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
exports.ClientWebSocketServer = ClientWebSocketServer;
