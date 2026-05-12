import type { Request, Response } from "express"
import * as workoutService from "../service/workout.service.js"
import { generatePlanWithAI } from "../service/ai-generator.service.js"
import { userId } from "../../../utils/req-helpers.js"

// GET /api/v1/workouts/plan
export async function getPlan(req: Request, res: Response) {
    const plan = await workoutService.getActivePlan(userId(req))
    if (!plan) {
        return res.json({ plan: null })
    }
    res.json({ plan })
}

// POST /api/v1/workouts/plan/generate
export async function generatePlan(req: Request, res: Response) {
    const plan = await workoutService.regeneratePlanForUser(userId(req))
    res.status(201).json({ plan })
}

// POST /api/v1/workouts/plan/ai-generate — Groq-backed alternative.
export async function aiGeneratePlan(req: Request, res: Response) {
    const plan = await generatePlanWithAI(userId(req))
    res.status(201).json({ plan })
}

// GET /api/v1/workouts/plan/today
//   Returns { day: PlanDay | null }. Null = rest day (or no plan).
export async function getToday(req: Request, res: Response) {
    const result = await workoutService.getTodayForUser(userId(req))
    res.json(result)
}

// Swap moved to plan-edit.controller.updateExercise (PATCH /plan/exercises/:id).
