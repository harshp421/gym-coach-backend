import { closePool, verifyDbConnection } from "./config/dbConnect.js";
import { startEmailWorker, stopEmailWorker } from "./utils/email/worker.js";
async function start() {
    await verifyDbConnection();
    startEmailWorker();
    console.log("[worker] running");
    const shutdown = async (signal) => {
        console.log(`[worker] ${signal} received, shutting down`);
        stopEmailWorker();
        await closePool();
        process.exit(0);
    };
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
}
start().catch((err) => {
    console.error("[worker] startup failed:", err);
    process.exit(1);
});
//# sourceMappingURL=worker.js.map