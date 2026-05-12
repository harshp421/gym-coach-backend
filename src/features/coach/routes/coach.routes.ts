import { Router } from "express"
import * as ctrl from "../controller/coach.controller.js"
import { requireAuth } from "../../../middleware/requireAuth.js"
import { validateBody } from "../../../middleware/validate.js"
import { rateLimit } from "../../../middleware/rateLimit.js"
import { sendMessageSchema } from "../coach.schemas.js"

const router = Router()
router.use(requireAuth)

router.get("/messages", ctrl.listMessages)
router.delete("/messages", ctrl.clearMessages)
// Coach sends hit Groq, which is the most expensive call in the system.
// Keep the bucket tight so a single user can't accidentally (or
// intentionally) drain the API budget.
router.post(
    "/messages",
    rateLimit("coach"),
    validateBody(sendMessageSchema),
    ctrl.sendMessage,
)

export default router
