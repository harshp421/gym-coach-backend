import { ENV } from "../../../config/env.config.js";
import { HttpError } from "../../../utils/http-error.js";
/** Build a vision content array: prompt text + one image URL. */
export function visionContent(text, imageUrl) {
    return [
        { type: "text", text },
        { type: "image_url", image_url: { url: imageUrl } },
    ];
}
export function isGroqConfigured() {
    return !!ENV.GROQ_API_KEY;
}
/**
 * Async generator yielding text deltas from Groq's chat completion stream.
 * Throws on transport errors or non-2xx responses; the controller catches
 * and translates to an `event: error` SSE frame.
 *
 * Uses native fetch (Node 18+) for native streaming support; axios doesn't
 * stream cleanly in node without `responseType: "stream"` + manual parsing.
 */
export async function* streamGroqChat(args) {
    if (!ENV.GROQ_API_KEY) {
        throw new HttpError(503, "coach_not_configured");
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
    });
    if (!response.ok || !response.body) {
        const body = await response.text().catch(() => "");
        throw new HttpError(502, `Coach upstream error (${response.status}): ${body.slice(0, 300)}`);
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    try {
        for (;;) {
            const { value, done } = await reader.read();
            if (done)
                break;
            buffer += decoder.decode(value, { stream: true });
            // SSE frames separated by "\n\n"; within a frame, only `data:`
            // lines carry payload for OpenAI-compatible streams.
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";
            for (const line of lines) {
                if (!line.startsWith("data: "))
                    continue;
                const payload = line.slice(6).trim();
                if (payload === "" || payload === "[DONE]") {
                    if (payload === "[DONE]")
                        return;
                    continue;
                }
                try {
                    const parsed = JSON.parse(payload);
                    const delta = parsed?.choices?.[0]?.delta?.content;
                    if (delta)
                        yield delta;
                }
                catch {
                    // ignore malformed frames; continue streaming.
                }
            }
        }
    }
    finally {
        reader.releaseLock?.();
    }
}
//# sourceMappingURL=groq.client.js.map