import { HttpError } from "../../../utils/http-error.js";
import * as coachService from "../service/coach.service.js";
import { userId } from "../../../utils/req-helpers.js";
function userName(req) {
    return req.user?.name ?? null;
}
// GET /api/v1/coach/messages?limit=N
export async function listMessages(req, res) {
    const rawLimit = parseInt(String(req.query.limit ?? "50"), 10);
    const limit = Number.isFinite(rawLimit)
        ? Math.min(Math.max(rawLimit, 1), 200)
        : 50;
    const items = await coachService.listMessages(userId(req), limit);
    res.json({ items });
}
// DELETE /api/v1/coach/messages
export async function clearMessages(req, res) {
    await coachService.clearMessages(userId(req));
    res.status(204).send();
}
/**
 * POST /api/v1/coach/messages — Server-Sent Events.
 * Persists the user message, streams assistant tokens, persists the
 * assembled assistant message at the end. Aborts the upstream Groq call
 * if the client disconnects mid-stream.
 */
export async function sendMessage(req, res) {
    if (!coachService.isGroqConfigured()) {
        // Don't open the SSE stream if we know we can't fulfill it.
        throw new HttpError(503, "coach_not_configured");
    }
    const uid = userId(req);
    const name = userName(req);
    const content = req.body.content;
    const imageUrl = req.body.imageUrl;
    // Open the SSE response immediately. Headers picked for reliability
    // through dev proxies (no transform, no buffering).
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();
    const writeEvent = (event, data) => {
        res.write(`event: ${event}\n`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };
    // AbortController chained from the request — when the client navigates
    // away or closes the tab, abort the upstream Groq fetch so we don't
    // burn tokens on a response no one's reading.
    const abort = new AbortController();
    const onClose = () => abort.abort();
    req.on("close", onClose);
    let assistant = "";
    try {
        const { sessionId, messages, model } = await coachService.startTurn(uid, name, content, imageUrl);
        for await (const chunk of coachService.streamGroqChat({
            messages,
            model,
            signal: abort.signal,
        })) {
            assistant += chunk;
            writeEvent("chunk", { text: chunk });
        }
        if (assistant.trim().length > 0) {
            const persisted = await coachService.persistAssistantMessage(sessionId, assistant);
            writeEvent("done", { messageId: persisted.id });
        }
        else {
            writeEvent("done", { messageId: null });
        }
    }
    catch (err) {
        const message = err instanceof HttpError
            ? err.message
            : err instanceof Error
                ? err.message
                : "Unknown error";
        writeEvent("error", { message });
    }
    finally {
        req.off("close", onClose);
        res.end();
    }
}
//# sourceMappingURL=coach.controller.js.map