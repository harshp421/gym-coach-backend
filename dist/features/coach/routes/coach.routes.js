import { Router } from "express";
import * as ctrl from "../controller/coach.controller.js";
import { requireAuth } from "../../../middleware/requireAuth.js";
import { validateBody } from "../../../middleware/validate.js";
import { sendMessageSchema } from "../coach.schemas.js";
const router = Router();
router.use(requireAuth);
router.get("/messages", ctrl.listMessages);
router.delete("/messages", ctrl.clearMessages);
router.post("/messages", validateBody(sendMessageSchema), ctrl.sendMessage);
export default router;
//# sourceMappingURL=coach.routes.js.map