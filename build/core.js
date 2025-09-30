"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DTraderCrypto = void 0;
const gateio_websocket_js_1 = require("./gateio-websocket.js");
const client_websocket_js_1 = require("./client-websocket.js");
const event_bus_js_1 = require("./event-bus.js");
/**
 * Основное ядро системы dtrader-crypto
 * Координирует работу всех компонентов и управляет жизненным циклом
 */
class DTraderCrypto {
    gateIO;
    clientWS;
    eventBus;
    isRunning = false;
    coreLoop = null;
    lastPongTime = 0;
    startupTime = 0;
    // Стандартные каналы для подписки
    DEFAULT_CHANNELS = [
        "spot.tickers",
        "spot.trades",
        "spot.order_book",
    ];
    constructor() {
        this.eventBus = event_bus_js_1.EventBus.getInstance();
        this.gateIO = new gateio_websocket_js_1.GateIOWebSocket();
        this.clientWS = new client_websocket_js_1.ClientWebSocketServer(8080);
        this.setupEventListeners();
    }
    /**
     * Запуск системы
     */
    async start() {
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
    stop() {
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
    startCoreLoop() {
        // Основной цикл с интервалом 1 секунда для мониторинга
        this.coreLoop = setInterval(() => {
            if (!this.isRunning)
                return;
            // Отправка статуса системы
            this.sendSystemStatus();
            // Дополнительные проверки здоровья системы могут быть добавлены здесь
        }, 1000);
    }
    /**
     * Отправка статуса системы всем клиентам
     */
    sendSystemStatus() {
        const status = {
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
    setupEventListeners() {
        // Обработка pong от Gate.io
        this.eventBus.on("pong_received", (data) => {
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
        this.eventBus.on("system_status_request", (data) => {
            const status = this.getStatus();
            this.eventBus.emit("system_status", status);
        });
        // Обработка критических ошибок
        this.eventBus.on("gateio_error", (data) => {
            // В будущем здесь может быть логика обработки критических ошибок
        });
        // Обработка максимального количества переподключений
        this.eventBus.on("gateio_max_reconnects", (data) => {
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
    getStatus() {
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
    isSystemRunning() {
        return this.isRunning;
    }
    /**
     * Получение времени работы системы
     */
    getUptime() {
        return this.isRunning ? Date.now() - this.startupTime : 0;
    }
}
exports.DTraderCrypto = DTraderCrypto;
