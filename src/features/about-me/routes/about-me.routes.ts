import { Router } from "express"
import * as ctrl from "../controller/about-me.controller.js"
import { validateBody } from "../../../middleware/validate.js"
import { rateLimit } from "../../../middleware/rateLimit.js"
import { askAboutMeSchema } from "../about-me.schemas.js"

const router = Router()

// Public (no auth) — answers questions about Harsh from his resume.
// Hits Groq, so keep a rate-limit bucket on it.
router.post(
    "/ai/about-me",
    validateBody(askAboutMeSchema),
    ctrl.askAboutMe,
)

// Read-only conversation fetch by visitorId (query param).
router.get("/ai/about-me/messages", ctrl.getConversation)

export default router
