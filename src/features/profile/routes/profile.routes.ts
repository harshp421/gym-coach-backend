import { Router } from "express"
import * as ctrl from "../controller/profile.controller.js"
import { requireAuth } from "../../../middleware/requireAuth.js"
import { validateBody } from "../../../middleware/validate.js"
import {
    bodyMetricSchema,
    completeOnboardingSchema,
    updateProfileSchema,
} from "../profile.schemas.js"

const router = Router()

router.use(requireAuth)

router.get("/profile", ctrl.getProfile)
router.put("/profile", validateBody(updateProfileSchema), ctrl.updateProfile)
router.post(
    "/profile/complete-onboarding",
    validateBody(completeOnboardingSchema),
    ctrl.completeOnboarding
)

router.get("/body-metrics", ctrl.listBodyMetrics)
router.post("/body-metrics", validateBody(bodyMetricSchema), ctrl.addBodyMetric)

export default router
