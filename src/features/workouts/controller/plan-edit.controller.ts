import type { Request, Response } from "express"
import * as planEditService from "../service/plan-edit.service.js"
import { paramId, userId } from "../../../utils/req-helpers.js"

// PATCH /api/v1/workouts/plan
export async function updatePlan(req: Request, res: Response) {
    const plan = await planEditService.updatePlan(userId(req), req.body)
    res.json({ plan })
}

// POST /api/v1/workouts/plan/empty
export async function createEmptyPlan(req: Request, res: Response) {
    const plan = await planEditService.createEmptyPlan(userId(req), req.body)
    res.status(201).json({ plan })
}

// DELETE /api/v1/workouts/plan
export async function deletePlan(req: Request, res: Response) {
    await planEditService.deletePlan(userId(req))
    res.status(204).send()
}

// POST /api/v1/workouts/plan/days
export async function createDay(req: Request, res: Response) {
    const plan = await planEditService.createDay(userId(req), req.body)
    res.status(201).json({ plan })
}

// PATCH /api/v1/workouts/plan/days/:dayId
export async function updateDay(req: Request, res: Response) {
    const plan = await planEditService.updateDay(
        userId(req),
        paramId(req, "dayId"),
        req.body,
    )
    res.json({ plan })
}

// DELETE /api/v1/workouts/plan/days/:dayId
export async function deleteDay(req: Request, res: Response) {
    const plan = await planEditService.deleteDay(
        userId(req),
        paramId(req, "dayId"),
    )
    res.json({ plan })
}

// POST /api/v1/workouts/plan/days/reorder
export async function reorderDays(req: Request, res: Response) {
    const plan = await planEditService.reorderDays(userId(req), req.body)
    res.json({ plan })
}

// POST /api/v1/workouts/plan/days/:dayId/exercises
export async function createExercise(req: Request, res: Response) {
    const plan = await planEditService.createExercise(
        userId(req),
        paramId(req, "dayId"),
        req.body,
    )
    res.status(201).json({ plan })
}

// PATCH /api/v1/workouts/plan/exercises/:planExerciseId
//   Consolidated swap + edit. Empty body is rejected by the schema.
export async function updateExercise(req: Request, res: Response) {
    const plan = await planEditService.updateExercise(
        userId(req),
        paramId(req, "planExerciseId"),
        req.body,
    )
    res.json({ plan })
}

// DELETE /api/v1/workouts/plan/exercises/:planExerciseId
export async function deleteExercise(req: Request, res: Response) {
    const plan = await planEditService.deleteExercise(
        userId(req),
        paramId(req, "planExerciseId"),
    )
    res.json({ plan })
}

// POST /api/v1/workouts/plan/days/:dayId/exercises/reorder
export async function reorderExercises(req: Request, res: Response) {
    const plan = await planEditService.reorderExercises(
        userId(req),
        paramId(req, "dayId"),
        req.body,
    )
    res.json({ plan })
}
