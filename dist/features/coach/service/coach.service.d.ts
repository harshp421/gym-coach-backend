import type { ChatMessage } from "../coach.types.js";
import { isGroqConfigured, streamGroqChat, type GroqMessage } from "./groq.client.js";
export declare function listMessages(userId: string, limit: number): Promise<ChatMessage[]>;
export declare function clearMessages(userId: string): Promise<void>;
/**
 * Persist the user message + build everything the controller needs to
 * drive the stream:
 *   - sessionId for the final assistant write
 *   - messages array ready to ship to Groq, with the latest user turn
 *     formatted as a vision payload when an imageUrl is attached
 *   - the model to use (vision model when an image is in this turn,
 *     otherwise the default text model)
 *
 * History turns are kept text-only — past images live in the assistant's
 * text descriptions, which is enough context without re-fetching every
 * old photo on every turn.
 */
export declare function startTurn(userId: string, name: string | null, userContent: string, imageUrl?: string | null): Promise<{
    sessionId: string;
    messages: GroqMessage[];
    model: string;
}>;
export declare function persistAssistantMessage(sessionId: string, content: string): Promise<ChatMessage>;
export { streamGroqChat, isGroqConfigured };
//# sourceMappingURL=coach.service.d.ts.map