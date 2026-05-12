import { Router } from "express"
import * as ctrl from "../controller/auth.controller.js"
import { validateBody } from "../../../middleware/validate.js"
import { requireAuth } from "../../../middleware/requireAuth.js"
import { rateLimit } from "../../../middleware/rateLimit.js"
import {
    forgotPasswordSchema,
    loginSchema,
    oauthSchema,
    registerSchema,
    resetPasswordSchema,
    verifyEmailSchema,
} from "../auth.schemas.js"

const router = Router()

// Auth burst limit on the credential endpoints — defends against
// credential stuffing, brute-force password guessing, and email-bomb
// abuse of forgot-password / resend-verification.
const limit = rateLimit("auth")

router.post("/register", limit, validateBody(registerSchema), ctrl.register)
router.post("/login", limit, validateBody(loginSchema), ctrl.login)
router.post("/logout", ctrl.logout)
router.post("/forgot-password", limit, validateBody(forgotPasswordSchema), ctrl.forgotPassword)
router.post("/reset-password", limit, validateBody(resetPasswordSchema), ctrl.resetPassword)
router.post("/verify-email", limit, validateBody(verifyEmailSchema), ctrl.verifyEmail)
router.post("/resend-verification", limit, requireAuth, ctrl.resendVerification)
router.post("/oauth", limit, validateBody(oauthSchema), ctrl.oauth)
router.get("/me", requireAuth, ctrl.me)

export default router
