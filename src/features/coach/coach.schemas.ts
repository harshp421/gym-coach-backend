import { z } from "zod"

// POST /api/v1/coach/messages
//   `imageUrl` is optional — when set, the message is routed through the
//   Groq vision model. We restrict to https URLs to keep prompts safe.
export const sendMessageSchema = z.object({
    content: z
        .string()
        .trim()
        .min(1, "Say something")
        .max(4000, "That's a lot — break it into a few messages"),
    imageUrl: z
        .url("Bad image URL")
        .max(2000)
        .refine((u) => u.startsWith("https://"), {
            message: "Image URL must be https",
        })
        .optional(),
})
export type SendMessageInput = z.infer<typeof sendMessageSchema>
