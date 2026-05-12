import { Router } from "express";
import * as ctrl from "../controller/plan-edit.controller.js";
import { requireAuth } from "../../../middleware/requireAuth.js";
import { validateBody } from "../../../middleware/validate.js";
import { createDaySchema, createEmptyPlanSchema, createExerciseSchema, reorderDaysSchema, reorderExercisesSchema, updateDaySchema, updateExerciseSchema, updatePlanSchema, } from "../plan-edit.schemas.js";
const router = Router();
router.use(requireAuth);
// Plan-level
router.patch("/plan", validateBody(updatePlanSchema), ctrl.updatePlan);
router.post("/plan/empty", validateBody(createEmptyPlanSchema), ctrl.createEmptyPlan);
router.delete("/plan", ctrl.deletePlan);
// Days — order matters: register `/plan/days/reorder` before
// `/plan/days/:dayId` so the literal path doesn't get captured as the id.
router.post("/plan/days/reorder", validateBody(reorderDaysSchema), ctrl.reorderDays);
router.post("/plan/days", validateBody(createDaySchema), ctrl.createDay);
router.patch("/plan/days/:dayId", validateBody(updateDaySchema), ctrl.updateDay);
router.delete("/plan/days/:dayId", ctrl.deleteDay);
// Exercises within a day. Same ordering caveat for `/exercises/reorder`.
router.post("/plan/days/:dayId/exercises/reorder", validateBody(reorderExercisesSchema), ctrl.reorderExercises);
router.post("/plan/days/:dayId/exercises", validateBody(createExerciseSchema), ctrl.createExercise);
router.patch("/plan/exercises/:planExerciseId", validateBody(updateExerciseSchema), ctrl.updateExercise);
router.delete("/plan/exercises/:planExerciseId", ctrl.deleteExercise);
export default router;
//# sourceMappingURL=plan-edit.routes.js.map