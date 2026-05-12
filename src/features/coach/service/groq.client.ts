import { ENV } from "../../../config/env.config.js"
import { HttpError } from "../../../utils/http-error.js"
import type { ChatRole } from "../coach.types.js"

/**
 * Groq accepts two shapes for message content:
 *   - plain string for text-only turns
 *   - array of parts (text + image_url) for vision turns
 *
 * The OpenAI-compat API uses `image_url.url` for the image reference.
 */
export type GroqContentPart =
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string } }

export type GroqMessage = {
    role: ChatRole
    content: string | GroqContentPart[]
}

export type StreamArgs = {
    messages: GroqMessage[]
    /** Optional override; defaults to ENV.GROQ_MODEL. */
    model?: string
    /** Aborts the upstream request when the client disconnects. */
    signal?: AbortSignal
    /** Cap output. Llama-3.3 supports up to 32k; we don't need that. */
    maxTokens?: number
    temperature?: number
}

/** Build a vision content array: prompt text + one image URL. */
export function visionContent(text: string, imageUrl: string): GroqContentPart[] {
    return [
        { type: "text", text },
        { type: "image_url", image_url: { url: imageUrl } },
    ]
}

export function isGroqConfigured(): boolean {
    return !!ENV.GROQ_API_KEY
}

/**
 * One-shot, non-streamed chat completion. Used by the plan generator —
 * it needs a single JSON object back, not a token stream. `responseFormat`
 * defaults to `json_object` which forces the model to emit valid JSON.
 */
export async function chatCompletion(args: {
    messages: GroqMessage[]
    model?: string
    maxTokens?: number
    temperature?: number
    responseFormat?: "json_object" | "text"
    signal?: AbortSignal
}): Promise<string> {
    if (!ENV.GROQ_API_KEY) {
        throw new HttpError(503, "coach_not_configured")
    }

    const response = await fetch(`${ENV.GROQ_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${ENV.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
            model: args.model ?? ENV.GROQ_MODEL,
            messages: args.messages,
            stream: false,
            max_tokens: args.maxTokens ?? 2048,
            temperature: args.temperature ?? 0.6,
            response_format: {
                type: args.responseFormat ?? "json_object",
            },
        }),
        signal: args.signal,
    })

    if (!response.ok) {
        const body = await response.text().catch(() => "")
        throw new HttpError(
            502,
            `Coach upstream error (${response.status}): ${body.slice(0, 300)}`,
        )
    }

    const json = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>
    }
    const content = json.choices?.[0]?.message?.content
    if (!content) {
        throw new HttpError(502, "Coach returned an empty response")
    }
    return content
}

/**
 * Async generator yielding text deltas from Groq's chat completion stream.
 * Throws on transport errors or non-2xx responses; the controller catches
 * and translates to an `event: error` SSE frame.
 *
 * Uses native fetch (Node 18+) for native streaming support; axios doesn't
 * stream cleanly in node without `responseType: "stream"` + manual parsing.
 */
export async function* streamGroqChat(
    args: StreamArgs,
): AsyncGenerator<string, void, void> {
    if (!ENV.GROQ_API_KEY) {
        throw new HttpError(503, "coach_not_configured")
    }

    const response = await fetch(`${ENV.GROQ_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${ENV.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
            model: args.model ?? ENV.GROQ_MODEL,
            messages: args.messages,
            stream: true,
            max_tokens: args.maxTokens ?? 1024,
            temperature: args.temperature ?? 0.7,
        }),
        signal: args.signal,
    })

    if (!response.ok || !response.body) {
        const body = await response.text().catch(() => "")
        throw new HttpError(
            502,
            `Coach upstream error (${response.status}): ${body.slice(0, 300)}`,
        )
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ""

    try {
        for (;;) {
            const { value, done } = await reader.read()
            if (done) break
            buffer += decoder.decode(value, { stream: true })

            // SSE frames separated by "\n\n"; within a frame, only `data:`
            // lines carry payload for OpenAI-compatible streams.
            const lines = buffer.split("\n")
            buffer = lines.pop() ?? ""
            for (const line of lines) {
                if (!line.startsWith("data: ")) continue
                const payload = line.slice(6).trim()
                if (payload === "" || payload === "[DONE]") {
                    if (payload === "[DONE]") return
                    continue
                }
                try {
                    const parsed = JSON.parse(payload)
                    const delta: string | undefined =
                        parsed?.choices?.[0]?.delta?.content
                    if (delta) yield delta
                } catch {
                    // ignore malformed frames; continue streaming.
                }
            }
        }
    } finally {
        reader.releaseLock?.()
    }
}
