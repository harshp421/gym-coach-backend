import { Router } from "express";
import * as ctrl from "../controller/exercises.controller.js";
import { requireAuth } from "../../../middleware/requireAuth.js";
const router = Router();
router.use(requireAuth);
router.get("/", ctrl.listExercises);
router.get("/:slug", ctrl.getExercise);
export default router;
//# sourceMappingURL=exercises.routes.js.map