import { Router } from "express"
import * as ctrl from "../controller/exercises.controller.js"
import { requireAuth } from "../../../middleware/requireAuth.js"

const router = Router()

router.use(requireAuth)

router.get("/", ctrl.listExercises)
// /gallery must come BEFORE /:slug so it doesn't get matched as a slug.
router.get("/gallery", ctrl.getGallery)
router.post("/:id/like", ctrl.likeExercise)
router.delete("/:id/like", ctrl.unlikeExercise)
router.get("/:slug", ctrl.getExercise)

export default router
