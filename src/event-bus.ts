/**
 * Центральная шина событий для связи между модулями
 * Реализует паттерн Наблюдатель (Observer)
 */

type EventCallback = (data: any) => void;

export class EventBus {
  private static instance: EventBus;
  private events: Map<string, EventCallback[]> = new Map();

  // Приватный конструктор для реализации Singleton
  private constructor() {}

  /**
   * Получить экземпляр EventBus (Singleton)
   */
  public static getInstance(): EventBus {
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
  public on(event: string, callback: EventCallback): void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(callback);
  }

  /**
   * Отправить событие
   * @param event - Название события
   * @param data - Данные события
   */
  public emit(event: string, data: any): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      // Вызываем все обработчики асинхронно для избежания блокировок
      callbacks.forEach((callback) => {
        setImmediate(() => {
          try {
            callback(data);
          } catch (error) {
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
  public off(event: string, callback: EventCallback): void {
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
  public clear(event: string): void {
    this.events.delete(event);
  }
}
