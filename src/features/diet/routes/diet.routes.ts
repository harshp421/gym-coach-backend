import { Router } from "express"
import * as prefsCtrl from "../controller/preferences.controller.js"
import * as planCtrl from "../controller/plan.controller.js"
import { requireAuth } from "../../../middleware/requireAuth.js"
import { rateLimit } from "../../../middleware/rateLimit.js"
import { validateBody } from "../../../middleware/validate.js"
import {
    completePreferencesSchema,
    updatePreferencesSchema,
} from "../diet.schemas.js"

const router = Router()

router.use(requireAuth)

router.get("/preferences", prefsCtrl.getPreferences)
router.put(
    "/preferences",
    validateBody(updatePreferencesSchema),
    prefsCtrl.updatePreferences,
)
router.post(
    "/preferences/complete",
    validateBody(completePreferencesSchema),
    prefsCtrl.completePreferences,
)

router.get("/plan", planCtrl.getPlan)
// Tighter rate limit on /generate — each call hits Groq and costs ~10s
// of latency + tokens. Bucket = 10/hour per user (see middleware/rateLimit.ts).
router.post("/plan/generate", rateLimit("diet"), planCtrl.generatePlan)

export default router
