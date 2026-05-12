import { Router } from "express"
import * as ctrl from "../controller/sessions.controller.js"
import { requireAuth } from "../../../middleware/requireAuth.js"
import { validateBody } from "../../../middleware/validate.js"
import {
    completeSessionSchema,
    createSessionSchema,
    logSetSchema,
} from "../sessions.schemas.js"

const router = Router()

router.use(requireAuth)

// Recent sessions list — must come before /sessions/:id so :id doesn't
// swallow the bare /sessions GET.
router.get("/sessions", ctrl.listRecentSessions)

router.post(
    "/sessions",
    validateBody(createSessionSchema),
    ctrl.createSession
)
router.get("/sessions/active", ctrl.getActiveSession)
router.get("/sessions/:id", ctrl.getSession)
router.patch(
    "/sessions/:id/complete",
    validateBody(completeSessionSchema),
    ctrl.completeSession
)
router.delete("/sessions/:id", ctrl.abandonSession)

router.post(
    "/sessions/:id/sets",
    validateBody(logSetSchema),
    ctrl.logSet
)
router.delete("/sessions/:id/sets/:setLogId", ctrl.deleteSet)

// Per-exercise history (cross-plan, dereferenced via plan_exercises.exercise_id)
router.get("/exercises/:planExerciseId/history", ctrl.getExerciseHistory)

export default router
