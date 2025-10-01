export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: number;
}

export interface SystemStatus {
  status: "connected" | "disconnected";
  lastPong: number;
  gateIOConnected: boolean;
  clientsConnected: number;
}
