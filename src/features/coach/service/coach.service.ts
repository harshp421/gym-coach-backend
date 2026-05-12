import { pool } from "../../../config/dbConnect.js"
import { ENV } from "../../../config/env.config.js"
import { HttpError } from "../../../utils/http-error.js"
import type { ChatMessage, ChatSession } from "../coach.types.js"
import {
    isGroqConfigured,
    streamGroqChat,
    visionContent,
    type GroqMessage,
} from "./groq.client.js"
import { buildSystemPrompt } from "./context.service.js"

const MAX_RECENT_TURNS = 20

function mapSession(row: any): ChatSession {
    return {
        id: row.id,
        userId: row.user_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    }
}

function mapMessage(row: any): ChatMessage {
    return {
        id: row.id,
        sessionId: row.session_id,
        role: row.role,
        content: row.content,
        imageUrl: row.image_url ?? null,
        createdAt: row.created_at,
    }
}

/** One thread per user (v1). Lazy-create on first access. */
async function getOrCreateSession(userId: string): Promise<ChatSession> {
    await pool.query(
        `INSERT INTO chat_sessions (user_id) VALUES ($1)
         ON CONFLICT (user_id) DO NOTHING`,
        [userId],
    )
    const r = await pool.query(
        `SELECT * FROM chat_sessions WHERE user_id = $1`,
        [userId],
    )
    return mapSession(r.rows[0])
}

export async function listMessages(
    userId: string,
    limit: number,
): Promise<ChatMessage[]> {
    const session = await getOrCreateSession(userId)
    const r = await pool.query(
        `SELECT * FROM (
            SELECT * FROM chat_messages
            WHERE session_id = $1
            ORDER BY created_at DESC
            LIMIT $2
         ) t
         ORDER BY created_at ASC`,
        [session.id, limit],
    )
    return r.rows.map(mapMessage)
}

export async function clearMessages(userId: string): Promise<void> {
    const session = await getOrCreateSession(userId)
    await pool.query(`DELETE FROM chat_messages WHERE session_id = $1`, [
        session.id,
    ])
}

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
export async function startTurn(
    userId: string,
    name: string | null,
    userContent: string,
    imageUrl?: string | null,
): Promise<{
    sessionId: string
    messages: GroqMessage[]
    model: string
}> {
    if (!isGroqConfigured()) {
        throw new HttpError(503, "coach_not_configured")
    }

    const session = await getOrCreateSession(userId)
    await pool.query(
        `INSERT INTO chat_messages (session_id, role, content, image_url)
         VALUES ($1, 'user', $2, $3)`,
        [session.id, userContent, imageUrl ?? null],
    )

    const [systemPrompt, history] = await Promise.all([
        buildSystemPrompt(userId, name),
        loadRecentTurns(session.id, MAX_RECENT_TURNS),
    ])

    // Drop the just-persisted user turn from history and replace it with
    // a properly-formatted one (vision content array when imageUrl set).
    const trimmed = history.slice(0, -1)
    const currentTurn: GroqMessage = imageUrl
        ? {
              role: "user",
              content: visionContent(userContent, imageUrl),
          }
        : { role: "user", content: userContent }

    const messages: GroqMessage[] = [
        { role: "system", content: systemPrompt },
        ...trimmed.map((m) => ({ role: m.role, content: m.content })),
        currentTurn,
    ]

    return {
        sessionId: session.id,
        messages,
        model: imageUrl ? ENV.GROQ_VISION_MODEL : ENV.GROQ_MODEL,
    }
}

async function loadRecentTurns(
    sessionId: string,
    limit: number,
): Promise<{ role: "user" | "assistant"; content: string }[]> {
    const r = await pool.query(
        `SELECT * FROM (
            SELECT role, content, created_at FROM chat_messages
            WHERE session_id = $1 AND role IN ('user', 'assistant')
            ORDER BY created_at DESC
            LIMIT $2
         ) t
         ORDER BY created_at ASC`,
        [sessionId, limit],
    )
    return r.rows.map((row) => ({ role: row.role, content: row.content }))
}

export async function persistAssistantMessage(
    sessionId: string,
    content: string,
): Promise<ChatMessage> {
    const r = await pool.query(
        `INSERT INTO chat_messages (session_id, role, content)
         VALUES ($1, 'assistant', $2)
         RETURNING *`,
        [sessionId, content],
    )
    return mapMessage(r.rows[0])
}

// Re-export the streaming primitive so the controller has one entry point.
export { streamGroqChat, isGroqConfigured }
