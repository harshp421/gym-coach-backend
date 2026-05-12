import type { ChatRole } from "../coach.types.js";
/**
 * Groq accepts two shapes for message content:
 *   - plain string for text-only turns
 *   - array of parts (text + image_url) for vision turns
 *
 * The OpenAI-compat API uses `image_url.url` for the image reference.
 */
export type GroqContentPart = {
    type: "text";
    text: string;
} | {
    type: "image_url";
    image_url: {
        url: string;
    };
};
export type GroqMessage = {
    role: ChatRole;
    content: string | GroqContentPart[];
};
export type StreamArgs = {
    messages: GroqMessage[];
    /** Optional override; defaults to ENV.GROQ_MODEL. */
    model?: string;
    /** Aborts the upstream request when the client disconnects. */
    signal?: AbortSignal;
    /** Cap output. Llama-3.3 supports up to 32k; we don't need that. */
    maxTokens?: number;
    temperature?: number;
};
/** Build a vision content array: prompt text + one image URL. */
export declare function visionContent(text: string, imageUrl: string): GroqContentPart[];
export declare function isGroqConfigured(): boolean;
/**
 * Async generator yielding text deltas from Groq's chat completion stream.
 * Throws on transport errors or non-2xx responses; the controller catches
 * and translates to an `event: error` SSE frame.
 *
 * Uses native fetch (Node 18+) for native streaming support; axios doesn't
 * stream cleanly in node without `responseType: "stream"` + manual parsing.
 */
export declare function streamGroqChat(args: StreamArgs): AsyncGenerator<string, void, void>;
//# sourceMappingURL=groq.client.d.ts.map