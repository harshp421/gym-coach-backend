import app from "./app.js"
import { ENV } from "./config/env.config.js"
import { closePool, verifyDbConnection } from "./config/dbConnect.js"

async function start() {
    await verifyDbConnection()

    const server = app.listen(ENV.PORT, () => {
        console.log(`[server] listening on :${ENV.PORT}`)
    })

    const shutdown = async (signal: string) => {
        console.log(`[server] ${signal} received, shutting down`)
        server.close(async () => {
            await closePool()
            process.exit(0)
        })
        setTimeout(() => {
            console.error("[server] forced exit after 10s")
            process.exit(1)
        }, 10_000).unref()
    }

    process.on("SIGTERM", () => shutdown("SIGTERM"))
    process.on("SIGINT", () => shutdown("SIGINT"))
}

start().catch((err) => {
    console.error("[server] startup failed:", err)
    process.exit(1)
})
