import PG from "pg"
import { ENV } from "./env.config.js"

const isProd = ENV.GYM_ENVIRONMENT === "production"

// Neon's serverless pooler closes idle connections aggressively (often
// within 30–60s on free tier). The pg client otherwise hands out a stale
// socket on the next acquire and the first query fails with
// "Connection terminated unexpectedly". To stay ahead of that:
//   - ssl is enabled in both prod and dev (the Neon URL says sslmode=require)
//   - idleTimeoutMillis is short, so we discard before Neon does
//   - keepAlive surfaces dead sockets sooner via TCP probes
//   - allowExitOnIdle lets short-lived scripts (migrate, seed) terminate
export const pool = new PG.Pool({
    connectionString: ENV.GYM_POSTGRES_URI,
    max: 10,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
    allowExitOnIdle: true,
    ssl: isProd
        ? { rejectUnauthorized: true }
        : { rejectUnauthorized: false },
})

pool.on("error", (err) => {
    // Don't crash on idle-client failures — pg-pool drops the bad socket
    // and the next acquire gets a fresh one. Log a concise warning so
    // it's visible without spamming a stack trace.
    const code = (err as { code?: string }).code
    console.warn(
        `[db] idle client dropped${code ? ` (${code})` : ""}: ${err.message}`,
    )
})

export async function verifyDbConnection(): Promise<void> {
    const client = await pool.connect()
    try {
        await client.query("SELECT 1")
        console.log("[db] connection ok")
    } finally {
        client.release()
    }
}

export async function closePool(): Promise<void> {
    await pool.end()
    console.log("[db] pool closed")
}

/**
 * Retries once on the specific class of pg errors that mean "the socket
 * I handed you was dead" — `Connection terminated`, ECONNRESET, etc.
 * The pool drops the broken client on the first failure, so the retry
 * hits a fresh one. Use for short, idempotent queries — the email worker
 * is the main customer.
 */
export async function withConnectionRetry<T>(
    fn: () => Promise<T>,
): Promise<T> {
    try {
        return await fn()
    } catch (err) {
        if (!isStaleConnectionError(err)) throw err
        return await fn()
    }
}

export function isStaleConnectionError(err: unknown): boolean {
    if (!err || typeof err !== "object") return false
    const e = err as { message?: string; code?: string; cause?: unknown }
    // pg / libpq codes that signal "connection's gone, try again":
    //   57P01 admin_shutdown · 57P02 crash_shutdown · 57P03 cannot_connect_now
    const codes = ["ECONNRESET", "ETIMEDOUT", "EPIPE", "57P01", "57P02", "57P03"]
    if (e.code && codes.includes(e.code)) return true
    const message = e.message ?? ""
    if (
        message.includes("Connection terminated") ||
        message.includes("connection timeout") ||
        message.includes("server closed the connection")
    ) {
        return true
    }
    // pg often nests the real cause one level deep.
    if (e.cause) return isStaleConnectionError(e.cause)
    return false
}
