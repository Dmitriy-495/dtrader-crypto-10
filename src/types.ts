export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: number;
}

export interface PingPongMessage {
  time: number;
  channel: string;
}

export interface SystemStatus {
  status: "connected" | "disconnected" | "error";
  lastPong: number;
  gateIOConnected: boolean;
  clientsConnected: number;
}
