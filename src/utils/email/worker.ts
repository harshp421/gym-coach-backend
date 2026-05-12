import { isStaleConnectionError } from "../../config/dbConnect.js"
import { processNextBatch } from "./queue.service.js"

let started = false
let timer: NodeJS.Timeout | null = null

export function startEmailWorker(intervalMs = 5_000): void {
    if (started) return
    started = true

    // Track consecutive failures so a flapping DB doesn't pump a stack
    // trace every 5 seconds. After the first occurrence we collapse to a
    // single concise warning until the picture changes.
    let consecutiveFailures = 0
    let lastErrorMessage = ""

    const tick = async () => {
        try {
            await processNextBatch()
            if (consecutiveFailures > 0) {
                console.log(
                    `[email-worker] recovered after ${consecutiveFailures} failed tick${consecutiveFailures === 1 ? "" : "s"}`,
                )
            }
            consecutiveFailures = 0
            lastErrorMessage = ""
        } catch (err) {
            consecutiveFailures++
            const stale = isStaleConnectionError(err)
            const message = err instanceof Error ? err.message : String(err)

            // Stale-connection errors during dev (laptop sleep, Neon idle
            // eviction, …) are noisy and self-healing. Log once per outage
            // and stay quiet until the picture changes.
            if (stale) {
                if (consecutiveFailures === 1) {
                    console.warn(
                        `[email-worker] stale db connection — pool will recycle. (${message})`,
                    )
                }
                lastErrorMessage = message
                return
            }

            // Non-stale errors: log on first occurrence and on message
            // changes; otherwise remind once a minute at a 5s tick.
            if (consecutiveFailures === 1 || lastErrorMessage !== message) {
                console.error("[email-worker] tick failed:", err)
            } else if (consecutiveFailures % 12 === 0) {
                console.warn(
                    `[email-worker] still failing (${consecutiveFailures} ticks): ${message}`,
                )
            }
            lastErrorMessage = message
        }
    }

    timer = setInterval(tick, intervalMs)
    timer.unref()
    console.log(`[email-worker] started (every ${intervalMs}ms)`)

    void tick()
}

export function stopEmailWorker(): void {
    if (timer) {
        clearInterval(timer)
        timer = null
    }
    started = false
}
