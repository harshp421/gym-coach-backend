export type ChatRole = "user" | "assistant" | "system"

export type ChatMessage = {
    id: string
    sessionId: string
    role: ChatRole
    content: string
    /**
     * Optional image attached to a user message — Cloudinary URL. When
     * set, the message is routed through the Groq vision model so the
     * coach can describe what's in the photo (e.g. how to use a machine).
     */
    imageUrl: string | null
    createdAt: string
}

export type ChatSession = {
    id: string
    userId: string
    createdAt: string
    updatedAt: string
}
