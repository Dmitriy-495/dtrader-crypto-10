"use strict";
/**
 * Центральная шина событий для связи между модулями
 * Реализует паттерн Наблюдатель (Observer)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventBus = void 0;
class EventBus {
    static instance;
    events = new Map();
    // Приватный конструктор для реализации Singleton
    constructor() { }
    /**
     * Получить экземпляр EventBus (Singleton)
     */
    static getInstance() {
        if (!EventBus.instance) {
            EventBus.instance = new EventBus();
        }
        return EventBus.instance;
    }
    /**
     * Подписаться на событие
     * @param event - Название события
     * @param callback - Функция-обработчик
     */
    on(event, callback) {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        this.events.get(event).push(callback);
    }
    /**
     * Отправить событие
     * @param event - Название события
     * @param data - Данные события
     */
    emit(event, data) {
        const callbacks = this.events.get(event);
        if (callbacks) {
            // Вызываем все обработчики асинхронно для избежания блокировок
            callbacks.forEach((callback) => {
                setImmediate(() => {
                    try {
                        callback(data);
                    }
                    catch (error) {
                        // Ошибки обрабатываются бесшумно в соответствии с требованиями
                    }
                });
            });
        }
    }
    /**
     * Отписаться от события
     * @param event - Название события
     * @param callback - Функция-обработчик для удаления
     */
    off(event, callback) {
        const callbacks = this.events.get(event);
        if (callbacks) {
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }
    /**
     * Очистить все подписки на событие
     * @param event - Название события
     */
    clear(event) {
        this.events.delete(event);
    }
}
exports.EventBus = EventBus;
