import { Router } from "express";
import * as ctrl from "../controller/workout.controller.js";
import { requireAuth } from "../../../middleware/requireAuth.js";
const router = Router();
router.use(requireAuth);
router.get("/plan", ctrl.getPlan);
router.post("/plan/generate", ctrl.generatePlan);
router.get("/plan/today", ctrl.getToday);
// PATCH /plan/exercises/:planExerciseId now lives in plan-edit.routes.ts —
// the consolidated update endpoint accepts both swap (`{ exerciseId }`)
// and partial edits.
export default router;
//# sourceMappingURL=workout.routes.js.map