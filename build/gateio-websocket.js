"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GateIOWebSocket = void 0;
const ws_1 = __importDefault(require("ws"));
const event_bus_js_1 = require("./event-bus.js");
/**
 * Клиент WebSocket для подключения к бирже Gate.io
 * Обеспечивает устойчивое соединение с автоматическим переподключением
 */
class GateIOWebSocket {
    ws = null;
    eventBus;
    pingInterval = null;
    reconnectTimeout = null;
    isConnected = false;
    reconnectAttempts = 0;
    maxReconnectAttempts = 10;
    // Конфигурация подключения
    GATE_IO_WS_URL = "wss://ws.gate.io/v4/";
    PING_INTERVAL = 30000; // 30 секунд
    RECONNECT_DELAY = 5000; // 5 секунд
    constructor() {
        this.eventBus = event_bus_js_1.EventBus.getInstance();
        this.setupEventBusListeners();
    }
    /**
     * Подключение к Gate.io WebSocket
     */
    connect() {
        try {
            this.ws = new ws_1.default(this.GATE_IO_WS_URL);
            this.ws.on("open", () => this.handleOpen());
            this.ws.on("message", (data) => this.handleMessage(data));
            this.ws.on("close", (code, reason) => this.handleClose(code, reason));
            this.ws.on("error", (error) => this.handleError(error));
        }
        catch (error) {
            this.eventBus.emit("gateio_error", {
                error: error.message,
                context: "connect",
            });
        }
    }
    /**
     * Обработчик успешного подключения
     */
    handleOpen() {
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
    handleMessage(data) {
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
        }
        catch (error) {
            // Игнорируем некорректные JSON сообщения
        }
    }
    /**
     * Обработчик закрытия соединения
     */
    handleClose(code, reason) {
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
    handleError(error) {
        this.eventBus.emit("gateio_error", {
            error: error.message,
            context: "websocket",
            timestamp: Date.now(),
        });
    }
    /**
     * Запуск периодической отправки ping-сообщений
     */
    startPingInterval() {
        this.pingInterval = setInterval(() => {
            if (this.ws && this.isConnected) {
                const pingMessage = {
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
    scheduleReconnect() {
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
    cleanup() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }
    /**
     * Настройка слушателей событий из системы
     */
    setupEventBusListeners() {
        // Подписка на каналы
        this.eventBus.on("subscribe", (data) => {
            this.subscribeToChannels(data.channels);
        });
        // Отписка от каналов
        this.eventBus.on("unsubscribe", (data) => {
            this.unsubscribeFromChannels(data.channels);
        });
    }
    /**
     * Подписка на каналы рыночных данных
     */
    subscribeToChannels(channels) {
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
    unsubscribeFromChannels(channels) {
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
    sendMessage(message) {
        if (this.ws && this.isConnected) {
            this.ws.send(JSON.stringify(message));
        }
    }
    /**
     * Разрыв соединения
     */
    disconnect() {
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
    getConnectionStatus() {
        return this.isConnected;
    }
    /**
     * Получение количества попыток переподключения
     */
    getReconnectAttempts() {
        return this.reconnectAttempts;
    }
}
exports.GateIOWebSocket = GateIOWebSocket;
