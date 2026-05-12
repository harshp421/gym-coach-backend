import { z } from "zod"

// POST /api/v1/workouts/sessions
export const createSessionSchema = z.object({
    planDayId: z.uuid("Invalid plan day id"),
})
export type CreateSessionInput = z.infer<typeof createSessionSchema>

// PATCH /api/v1/workouts/sessions/:id/complete
export const completeSessionSchema = z.object({
    notes: z.string().max(2000).optional(),
})
export type CompleteSessionInput = z.infer<typeof completeSessionSchema>

// POST /api/v1/workouts/sessions/:id/sets
//   UPSERT on (session_id, plan_exercise_id, set_number).
//   weightKg is optional (NULL = bodyweight; 0 also allowed for empty bar).
export const logSetSchema = z.object({
    planExerciseId: z.uuid("Invalid plan exercise id"),
    setNumber: z.number().int().min(1).max(50),
    weightKg: z.number().min(0).max(1000).optional(),
    reps: z.number().int().min(1).max(500),
    rpe: z.number().min(1).max(10).optional(),
    notes: z.string().max(500).optional(),
})
export type LogSetInput = z.infer<typeof logSetSchema>
