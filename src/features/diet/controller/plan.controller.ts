import type { Request, Response } from "express"
import * as planService from "../service/plan.service.js"
import { userId } from "../../../utils/req-helpers.js"

// GET /api/v1/diet/plan
//   Returns the user's active plan or null (handle on the frontend with
//   a "no plan yet, generate one" CTA).
export async function getPlan(req: Request, res: Response) {
    const plan = await planService.getActivePlan(userId(req))
    if (!plan) return res.json({ plan: null })
    res.json({ plan })
}

// POST /api/v1/diet/plan/generate
//   Slow endpoint (~10–12s on Groq). Frontend must show a loading state.
//   Rate-limited via the "diet" bucket on the router.
export async function generatePlan(req: Request, res: Response) {
    const plan = await planService.regeneratePlanForUser(userId(req))
    res.status(201).json({ plan })
}
