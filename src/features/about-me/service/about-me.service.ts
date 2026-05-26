import { pool } from "../../../config/dbConnect.js"
import { HttpError } from "../../../utils/http-error.js"
import {
    chatCompletion,
    isGroqConfigured,
    streamGroqChat,
    type GroqMessage,
} from "../../coach/service/groq.client.js"
import { buildResumeAssistentPrompt } from "./about-me-context.service.js"

// After this many un-archived questions we compress the oldest turns into
// the session summary. Keep the most recent few turns verbatim so follow-up
// questions ("what about that project?") still have exact wording.
const MAX_QUESTIONS_BEFORE_COMPACT = 10
const KEEP_RECENT_MESSAGES = 4

type AboutMeSession = {
    id: string
    visitorId: string
    summary: string | null
}

type Turn = { role: "user" | "assistant"; content: string }

/** Stateless one-shot messages — no history. Kept for a simple ask mode. */
export function buildAboutMeMessages(question: string): GroqMessage[] {
    return [
        { role: "system", content: buildResumeAssistentPrompt() },
        { role: "user", content: question },
    ]
}

// ── Group 1: session & message plumbing ──────────────────────────────────

/** One thread per visitor. Lazy-create on first access (keyed on visitor_id). */
async function getOrCreateSession(visitorId: string): Promise<AboutMeSession> {
    await pool.query(
        `INSERT INTO about_me_sessions (visitor_id) VALUES ($1)
         ON CONFLICT (visitor_id) DO NOTHING`,
        [visitorId],
    )
    const r = await pool.query(
        `SELECT id, visitor_id, summary FROM about_me_sessions WHERE visitor_id = $1`,
        [visitorId],
    )
    const row = r.rows[0]
    return {
        id: row.id,
        visitorId: row.visitor_id,
        summary: row.summary ?? null,
    }
}

/** Recent, un-archived turns only — oldest first. These go in verbatim. */
async function loadActiveMessages(sessionId: string): Promise<Turn[]> {
    const r = await pool.query(
        `SELECT role, content FROM about_me_messages
         WHERE session_id = $1 AND archived = false
         ORDER BY created_at ASC`,
        [sessionId],
    )
    return r.rows.map((row) => ({ role: row.role, content: row.content }))
}

/** Count un-archived user turns — drives the compaction decision. */
async function countQuestions(sessionId: string): Promise<number> {
    const r = await pool.query(
        `SELECT count(*)::int AS n FROM about_me_messages
         WHERE session_id = $1 AND role = 'user' AND archived = false`,
        [sessionId],
    )
    return r.rows[0]?.n ?? 0
}

type ConversationMessage = {
    id: string
    role: "user" | "assistant"
    content: string
    archived: boolean
    createdAt: string
}

/**
 * Read-only fetch of a visitor's conversation. Does NOT create a session —
 * a GET shouldn't have side effects. Returns the rolling summary plus the
 * full message list (archived flag included so the client can show or hide
 * compacted turns as it likes).
 */
export async function getConversation(visitorId: string): Promise<{
    exists: boolean
    summary: string | null
    messages: ConversationMessage[]
}> {
    const sres = await pool.query(
        `SELECT id, summary FROM about_me_sessions WHERE visitor_id = $1`,
        [visitorId],
    )
    const session = sres.rows[0]
    if (!session) {
        return { exists: false, summary: null, messages: [] }
    }

    const mres = await pool.query(
        `SELECT id, role, content, archived, created_at FROM about_me_messages
         WHERE session_id = $1
         ORDER BY created_at ASC`,
        [session.id],
    )
    return {
        exists: true,
        summary: session.summary ?? null,
        messages: mres.rows.map((row) => ({
            id: row.id,
            role: row.role,
            content: row.content,
            archived: row.archived,
            createdAt:
                typeof row.created_at === "string"
                    ? row.created_at
                    : new Date(row.created_at).toISOString(),
        })),
    }
}

export async function persistAssistantMessage(
    sessionId: string,
    content: string,
): Promise<void> {
    await pool.query(
        `INSERT INTO about_me_messages (session_id, role, content)
         VALUES ($1, 'assistant', $2)`,
        [sessionId, content],
    )
}

// ── Group 3: compaction ───────────────────────────────────────────────────

/**
 * Fold the oldest active turns into the session summary, then archive them.
 * Non-streamed Groq call — we just need the summary string back.
 */
async function summarizeMessages(
    messages: Turn[],
    existingSummary: string | null,
): Promise<string> {
    const transcript = messages
        .map((m) => `${m.role}: ${m.content}`)
        .join("\n")

    const prompt = [
        existingSummary
            ? `Existing summary of the earlier conversation:\n${existingSummary}\n`
            : "",
        "Newer messages to fold into the summary:",
        transcript,
        "",
        "Write an updated summary in 3-4 sentences. Preserve what the visitor",
        "asked about and any facts already established. Plain prose, no preamble.",
    ]
        .filter(Boolean)
        .join("\n")

    return chatCompletion({
        messages: [{ role: "user", content: prompt }],
        responseFormat: "text",
        maxTokens: 400,
        temperature: 0.3,
    })
}

/** No-op until we exceed the question cap; otherwise compress + archive. */
async function maybeCompact(sessionId: string): Promise<void> {
    const questionCount = await countQuestions(sessionId)
    if (questionCount <= MAX_QUESTIONS_BEFORE_COMPACT) return

    const r = await pool.query(
        `SELECT id, role, content FROM about_me_messages
         WHERE session_id = $1 AND archived = false
         ORDER BY created_at ASC`,
        [sessionId],
    )
    const active = r.rows
    if (active.length <= KEEP_RECENT_MESSAGES) return

    const toSummarize = active.slice(0, active.length - KEEP_RECENT_MESSAGES)
    const oldIds = toSummarize.map((m) => m.id)

    const sres = await pool.query(
        `SELECT summary FROM about_me_sessions WHERE id = $1`,
        [sessionId],
    )
    const existingSummary: string | null = sres.rows[0]?.summary ?? null

    const newSummary = await summarizeMessages(
        toSummarize.map((m) => ({ role: m.role, content: m.content })),
        existingSummary,
    )

    await pool.query(
        `UPDATE about_me_sessions SET summary = $2, updated_at = now() WHERE id = $1`,
        [sessionId, newSummary],
    )
    await pool.query(
        `UPDATE about_me_messages SET archived = true WHERE id = ANY($1)`,
        [oldIds],
    )
}

// ── Group 2: the turn flow (what the controller calls) ───────────────────

/**
 * Persist the visitor's question, compact if we're over the cap, then build
 * everything the controller needs to stream:
 *   - sessionId for the final assistant write
 *   - messages array: resume system prompt + (summary) + recent turns
 *
 * The just-inserted question is the last active turn, so it's already the
 * tail of `loadActiveMessages` — no need to append it again.
 */
export async function startTurn(
    visitorId: string,
    question: string,
): Promise<{ sessionId: string; messages: GroqMessage[] }> {
    if (!isGroqConfigured()) {
        throw new HttpError(503, "about_me_not_configured")
    }

    const session = await getOrCreateSession(visitorId)

    await pool.query(
        `INSERT INTO about_me_messages (session_id, role, content)
         VALUES ($1, 'user', $2)`,
        [session.id, question],
    )

    await maybeCompact(session.id)

    // Re-read the summary — maybeCompact may have just written it.
    const sres = await pool.query(
        `SELECT summary FROM about_me_sessions WHERE id = $1`,
        [session.id],
    )
    const summary: string | null = sres.rows[0]?.summary ?? null
    const active = await loadActiveMessages(session.id)

    const messages: GroqMessage[] = [
        { role: "system", content: buildResumeAssistentPrompt() },
        ...(summary
            ? [
                  {
                      role: "system" as const,
                      content: `Earlier in this conversation: ${summary}`,
                  },
              ]
            : []),
        ...active.map((m) => ({ role: m.role, content: m.content })),
    ]

    return { sessionId: session.id, messages }
}

// Single entry point for the streaming primitive + config check.
export { streamGroqChat, isGroqConfigured }
