import type { Request, Response } from "express"
import { HttpError } from "../../../utils/http-error.js"
import * as aboutMeService from "../service/about-me.service.js"

// GET /api/v1/ai/about-me/messages?visitorId=...
// Read-only: returns the rolling summary + full message list for a visitor.
export async function getConversation(req: Request, res: Response) {
    const visitorId = String(req.query.visitorId ?? "").trim()
    if (!visitorId) {
        throw new HttpError(400, "visitorId is required")
    }
    const data = await aboutMeService.getConversation(visitorId)
    res.json(data)
}

/**
 * POST /api/v1/ai/about-me — Server-Sent Events.
 * Persists the visitor's question, streams the assistant's answer token by
 * token, then persists the assembled reply. Aborts the upstream Groq call
 * if the visitor disconnects mid-stream.
 */
export async function askAboutMe(req: Request, res: Response) {
    if (!aboutMeService.isGroqConfigured()) {
        // Don't open the SSE stream if we know we can't fulfill it.
        throw new HttpError(503, "about_me_not_configured")
    }

    const visitorId: string = req.body.visitorId
    const question: string = req.body.question

    // Open the SSE response immediately. Headers picked for reliability
    // through dev proxies (no transform, no buffering).
    res.setHeader("Content-Type", "text/event-stream")
    res.setHeader("Cache-Control", "no-cache, no-transform")
    res.setHeader("Connection", "keep-alive")
    res.setHeader("X-Accel-Buffering", "no")
    res.flushHeaders?.()

    const writeEvent = (event: string, data: unknown) => {
        res.write(`event: ${event}\n`)
        res.write(`data: ${JSON.stringify(data)}\n\n`)
    }

    // When the visitor closes the tab, abort the upstream Groq fetch so we
    // don't burn tokens on a response no one's reading.
    const abort = new AbortController()
    const onClose = () => abort.abort()
    req.on("close", onClose)

    let assistant = ""
    try {
        const { sessionId, messages } = await aboutMeService.startTurn(
            visitorId,
            question,
        )

        for await (const chunk of aboutMeService.streamGroqChat({
            messages,
            signal: abort.signal,
        })) {
            assistant += chunk
            writeEvent("chunk", { text: chunk })
        }

        if (assistant.trim().length > 0) {
            await aboutMeService.persistAssistantMessage(sessionId, assistant)
        }
        writeEvent("done", {})
    } catch (err) {
        const message =
            err instanceof HttpError
                ? err.message
                : err instanceof Error
                  ? err.message
                  : "Unknown error"
        writeEvent("error", { message })
    } finally {
        req.off("close", onClose)
        res.end()
    }
}
