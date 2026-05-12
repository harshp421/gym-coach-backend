import { closePool, verifyDbConnection } from "./config/dbConnect.js"
import { startEmailWorker, stopEmailWorker } from "./utils/email/worker.js"

async function start() {
    await verifyDbConnection()
    startEmailWorker()
    console.log("[worker] running")

    const shutdown = async (signal: string) => {
        console.log(`[worker] ${signal} received, shutting down`)
        // Mirror the API server: if closePool hangs (a Neon socket can stall
        // for ~30s), force-exit so the orchestrator doesn't have to SIGKILL.
        const forceExit = setTimeout(() => {
            console.error("[worker] forced exit after 10s")
            process.exit(1)
        }, 10_000)
        forceExit.unref()
        stopEmailWorker()
        await closePool()
        clearTimeout(forceExit)
        process.exit(0)
    }

    process.on("SIGTERM", () => shutdown("SIGTERM"))
    process.on("SIGINT", () => shutdown("SIGINT"))
}

start().catch((err) => {
    console.error("[worker] startup failed:", err)
    process.exit(1)
})
