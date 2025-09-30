"use strict";
/**
 * Упрощенная точка входа для тестирования
 */
console.log("🚀 dtrader-crypto server starting...");
// Простая проверка работы
const eventBus = {
    emit: (event, data) => {
        console.log(`Event: ${event}`, data);
    },
};
// Имитация запуска системы
setTimeout(() => {
    eventBus.emit("system_started", {
        timestamp: Date.now(),
        status: "OK",
    });
    console.log("✅ Server is running!");
}, 1000);
// Обработка завершения
process.on("SIGINT", () => {
    console.log("🛑 Server stopping...");
    process.exit(0);
});
