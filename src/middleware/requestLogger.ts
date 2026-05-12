import { randomUUID } from "node:crypto"
import type { Request, Response, NextFunction } from "express"
import { ENV } from "../config/env.config.js"

/**
 * Lightweight access log: one line per request once the response closes,
 * with method, path, status, duration, and (when available) user id.
 *
 * In development, also dumps the request body and the JSON response body
 * underneath the access line so you can eyeball what each call sent/received.
 * Skipped for SSE responses (would spam chunk frames) and login bodies are
 * redacted so passwords never hit the terminal.
 */
const REDACT_KEYS = new Set([
    "password",
    "currentPassword",
    "newPassword",
    "idToken",
    "token",
])
const BODY_PREVIEW_LIMIT = 2048

export function requestLogger() {
    const dev = ENV.GYM_ENVIRONMENT === "development"

    return (req: Request, res: Response, next: NextFunction) => {
        const start = process.hrtime.bigint()
        const reqId = (req.headers["x-request-id"] as string) || shortId()
        // Echo so clients can correlate (and so other middleware can read it).
        res.setHeader("x-request-id", reqId)
        ;(req as Request & { id?: string }).id = reqId

        // Capture the response body in dev by wrapping json/send. We only
        // hold onto the first call — Express's helpers internally call send,
        // so guarding against the double-record keeps the log tidy.
        let captured: unknown = undefined
        let didCapture = false
        if (dev) {
            const origJson = res.json.bind(res)
            res.json = (body: unknown) => {
                if (!didCapture) {
                    captured = body
                    didCapture = true
                }
                return origJson(body)
            }
            const origSend = res.send.bind(res)
            res.send = (body: unknown) => {
                if (!didCapture) {
                    captured = body
                    didCapture = true
                }
                return origSend(body)
            }
        }

        res.on("finish", () => {
            const durationMs = Number(
                (process.hrtime.bigint() - start) / 1_000_000n,
            )
            const userId = req.user?.id
            const status = res.statusCode
            const tag = statusTag(status)
            // Skip the docs UI's static asset spam.
            if (req.originalUrl.startsWith("/docs/") && status === 200) return

            console.log(
                `${tag} ${req.method.padEnd(6)} ${status} ${durationMs.toString().padStart(4)}ms ${req.originalUrl}${userId ? ` user=${userId.slice(0, 8)}` : ""} (${reqId})`,
            )

            if (!dev) return
            const contentType = String(res.getHeader("content-type") ?? "")
            // SSE = an open token stream, dumping the assembled buffer is noise.
            if (contentType.includes("text/event-stream")) return

            const reqBody = previewBody(req.body)
            if (reqBody) console.log(`     ↳ req  ${reqBody}`)
            const resBody = previewBody(captured)
            if (resBody) console.log(`     ↳ res  ${resBody}`)
        })

        next()
    }
}

function statusTag(status: number): string {
    if (status >= 500) return "[err]"
    if (status >= 400) return "[warn]"
    if (status >= 300) return "[redir]"
    return "[ok]"
}

function shortId(): string {
    return randomUUID().slice(0, 8)
}

function previewBody(value: unknown): string | null {
    if (value === undefined || value === null) return null
    if (typeof value === "string") {
        return value.length === 0 ? null : truncate(value)
    }
    if (Buffer.isBuffer(value)) {
        return `<Buffer ${value.byteLength}b>`
    }
    if (typeof value !== "object") return truncate(String(value))
    if (Array.isArray(value) && value.length === 0) return null
    try {
        const redacted = redact(value)
        if (
            redacted &&
            typeof redacted === "object" &&
            !Array.isArray(redacted) &&
            Object.keys(redacted as Record<string, unknown>).length === 0
        ) {
            return null
        }
        return truncate(JSON.stringify(redacted))
    } catch {
        return "<unserializable>"
    }
}

function redact(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(redact)
    if (value && typeof value === "object") {
        const out: Record<string, unknown> = {}
        for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
            out[k] = REDACT_KEYS.has(k) ? "[redacted]" : redact(v)
        }
        return out
    }
    return value
}

function truncate(s: string): string {
    return s.length > BODY_PREVIEW_LIMIT
        ? `${s.slice(0, BODY_PREVIEW_LIMIT)}… (+${s.length - BODY_PREVIEW_LIMIT}b)`
        : s
}
