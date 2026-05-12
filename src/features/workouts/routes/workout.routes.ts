import { Router } from "express"
import * as ctrl from "../controller/workout.controller.js"
import { requireAuth } from "../../../middleware/requireAuth.js"
import { rateLimit } from "../../../middleware/rateLimit.js"

const router = Router()
router.use(requireAuth)

router.get("/plan", ctrl.getPlan)
router.post("/plan/generate", ctrl.generatePlan)
// AI generation hits Groq → reuse the coach bucket so it counts against
// the same per-user budget. Lots of regenerate clicks would otherwise
// drain the API key fast.
router.post("/plan/ai-generate", rateLimit("coach"), ctrl.aiGeneratePlan)
router.get("/plan/today", ctrl.getToday)

// PATCH /plan/exercises/:planExerciseId now lives in plan-edit.routes.ts —
// the consolidated update endpoint accepts both swap (`{ exerciseId }`)
// and partial edits.

export default router
