/**
 * Типы данных для системы dtrader-crypto
 * Определяет структуры сообщений и состояний
 */

// Базовое сообщение WebSocket
export interface WebSocketMessage {
  type: string; // Тип сообщения
  data: any; // Данные сообщения
  timestamp: number; // Временная метка
}

// Сообщение Ping/Pong для Gate.io
export interface PingPongMessage {
  time: number; // Временная метка
  channel: string; // Канал (spot.ping / spot.pong)
}

// Статус системы
export interface SystemStatus {
  status: "connected" | "disconnected" | "error"; // Статус соединения
  lastPong: number; // Время последнего pong
  gateIOConnected: boolean; // Соединение с Gate.io
  clientsConnected: number; // Количество подключенных клиентов
}

// Событие торговли
export interface TradeEvent {
  symbol: string; // Торговая пара
  price: number; // Цена
  quantity: number; // Количество
  timestamp: number; // Время сделки
}

// Ошибка системы
export interface SystemError {
  code: string; // Код ошибки
  message: string; // Сообщение ошибки
  timestamp: number; // Время ошибки
}
