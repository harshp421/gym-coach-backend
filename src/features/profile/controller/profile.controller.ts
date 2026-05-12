import type { Request, Response } from "express"
import * as profileService from "../service/profile.service.js"
import { regeneratePlanForUser } from "../../workouts/service/workout.service.js"
import { userId } from "../../../utils/req-helpers.js"

// GET /api/v1/profile
export async function getProfile(req: Request, res: Response) {
    const profile = await profileService.getOrCreateProfile(userId(req))
    res.json({
        profile,
        completedOnboarding: profile.onboardingCompletedAt != null,
    })
}

// PUT /api/v1/profile
export async function updateProfile(req: Request, res: Response) {
    const profile = await profileService.updateProfile(userId(req), req.body)
    res.json({ profile })
}

// POST /api/v1/profile/complete-onboarding
//   After persisting the profile + initial weight, kick off plan generation
//   so the user lands on a populated dashboard instead of a "no plan yet"
//   empty state. Plan gen failures are logged but don't fail onboarding —
//   the user can still hit "Generate plan" manually from /workouts/plan.
export async function completeOnboarding(req: Request, res: Response) {
    const uid = userId(req)
    const result = await profileService.completeOnboarding(uid, req.body)

    try {
        await regeneratePlanForUser(uid)
    } catch (err) {
        console.error(
            "[onboarding] plan auto-generation failed:",
            err instanceof Error ? err.message : err,
        )
    }

    res.status(201).json(result)
}

// GET /api/v1/body-metrics?limit=30&before=YYYY-MM-DD
export async function listBodyMetrics(req: Request, res: Response) {
    const rawLimit = parseInt(String(req.query.limit ?? "30"), 10)
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 30
    const before =
        typeof req.query.before === "string" && /^\d{4}-\d{2}-\d{2}$/.test(req.query.before)
            ? req.query.before
            : undefined
    const metrics = await profileService.listBodyMetrics(userId(req), { limit, before })
    res.json({ metrics })
}

// POST /api/v1/body-metrics
export async function addBodyMetric(req: Request, res: Response) {
    const metric = await profileService.upsertBodyMetric(userId(req), req.body)
    res.status(201).json({ metric })
}
