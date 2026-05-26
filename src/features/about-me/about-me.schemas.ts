import { z } from "zod"

export const askAboutMeSchema = z.object({
  visitorId: z.string().trim().min(1).max(100),
  question: z.string().trim().min(1).max(2000),
})
export type AskAboutMeInput = z.infer<typeof askAboutMeSchema>
