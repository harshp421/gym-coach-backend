import { Router } from "express";
import * as ctrl from "../controller/user-exercises.controller.js";
import { requireAuth } from "../../../middleware/requireAuth.js";
import { validateBody } from "../../../middleware/validate.js";
import { createUserExerciseSchema, updateUserExerciseSchema, } from "../user-exercises.schemas.js";
const router = Router();
router.use(requireAuth);
router.get("/", ctrl.listUserExercises);
router.post("/", validateBody(createUserExerciseSchema), ctrl.createUserExercise);
router.patch("/:id", validateBody(updateUserExerciseSchema), ctrl.updateUserExercise);
router.post("/:id/archive", ctrl.archiveUserExercise);
router.post("/:id/restore", ctrl.restoreUserExercise);
export default router;
//# sourceMappingURL=user-exercises.routes.js.map