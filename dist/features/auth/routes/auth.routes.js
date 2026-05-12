import { Router } from "express";
import * as ctrl from "../controller/auth.controller.js";
import { validateBody } from "../../../middleware/validate.js";
import { requireAuth } from "../../../middleware/requireAuth.js";
import { forgotPasswordSchema, loginSchema, oauthSchema, registerSchema, resetPasswordSchema, verifyEmailSchema, } from "../auth.schemas.js";
const router = Router();
router.post("/register", validateBody(registerSchema), ctrl.register);
router.post("/login", validateBody(loginSchema), ctrl.login);
router.post("/logout", ctrl.logout);
router.post("/forgot-password", validateBody(forgotPasswordSchema), ctrl.forgotPassword);
router.post("/reset-password", validateBody(resetPasswordSchema), ctrl.resetPassword);
router.post("/verify-email", validateBody(verifyEmailSchema), ctrl.verifyEmail);
router.post("/resend-verification", requireAuth, ctrl.resendVerification);
router.post("/oauth", validateBody(oauthSchema), ctrl.oauth);
router.get("/me", requireAuth, ctrl.me);
export default router;
//# sourceMappingURL=auth.routes.js.map