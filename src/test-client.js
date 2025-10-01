const WebSocket = require("ws");

console.log("🧪 Test client connecting to dtrader-crypto server...");

const ws = new WebSocket("ws://localhost:8080");

ws.on("open", function open() {
  console.log("✅ Connected to dtrader-crypto server");

  // Запрашиваем статус
  ws.send(
    JSON.stringify({
      type: "get_status",
      data: {},
      timestamp: Date.now(),
    })
  );
});

ws.on("message", function message(data) {
  const message = JSON.parse(data);

  switch (message.type) {
    case "welcome":
      console.log("👋 Server welcome:", message.data.message);
      break;

    case "system_status":
      console.log("📊 System status:", {
        gateIOConnected: message.data.gateIOConnected,
        clientsConnected: message.data.clientsConnected,
        lastPong: message.data.lastPong
          ? new Date(message.data.lastPong).toISOString()
          : "Never",
      });
      break;

    case "ping_sent":
      console.log("📤 Server sent ping to Gate.io");
      break;

    case "pong_received":
      console.log("📡 Server received pong from Gate.io:", {
        time: message.data.time,
        latency: message.data.pingLatency
          ? message.data.pingLatency + "ms"
          : "N/A",
      });
      break;

    case "gateio_status":
      console.log(
        "🔗 Gate.io connection:",
        message.data.connected ? "✅ Connected" : "❌ Disconnected"
      );
      break;

    default:
      console.log("📨 Message type:", message.type);
  }
});

ws.on("close", function close() {
  console.log("🔌 Disconnected from server");
});

ws.on("error", function error(err) {
  console.log("❌ Connection error:", err.message);
});

// Отправляем ping каждые 10 секунд для поддержания соединения
setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(
      JSON.stringify({
        type: "ping",
        data: {},
        timestamp: Date.now(),
      })
    );
  }
}, 10000);
