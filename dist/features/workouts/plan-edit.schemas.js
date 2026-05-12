import { z } from "zod";
// ---------------------------------------------------------------------------
// Atoms — reused across plan-edit schemas.
// ---------------------------------------------------------------------------
const NAME = z.string().trim().min(1, "Name can't be empty").max(80, "Too long");
const NOTES = z.string().max(2000);
const WEEKDAY = z.number().int().min(0).max(6);
const SETS = z.number().int().min(1).max(20);
const REPS = z.number().int().min(1).max(500);
const RPE = z.number().min(1).max(10);
const REST = z.number().int().min(0).max(900);
const GOAL = z.enum(["cut", "maintain", "bulk", "recomp"]);
// ---------------------------------------------------------------------------
// Plan-level
// ---------------------------------------------------------------------------
// PATCH /api/v1/workouts/plan
export const updatePlanSchema = z.object({
    name: NAME.nullable().optional(),
    notes: NOTES.nullable().optional(),
    goal: GOAL.optional(),
});
// POST /api/v1/workouts/plan/empty
export const createEmptyPlanSchema = z.object({
    name: NAME.optional(),
});
// ---------------------------------------------------------------------------
// Days
// ---------------------------------------------------------------------------
// POST /api/v1/workouts/plan/days
export const createDaySchema = z.object({
    name: NAME,
    weekdayHint: WEEKDAY.nullable().optional(),
});
// PATCH /api/v1/workouts/plan/days/:dayId
export const updateDaySchema = z.object({
    name: NAME.optional(),
    weekdayHint: WEEKDAY.nullable().optional(),
});
// POST /api/v1/workouts/plan/days/reorder
export const reorderDaysSchema = z
    .array(z.object({
    dayId: z.uuid("Invalid day id"),
    dayIndex: z.number().int().min(0).max(50),
}))
    .min(1);
// ---------------------------------------------------------------------------
// Exercises
// ---------------------------------------------------------------------------
// POST /api/v1/workouts/plan/days/:dayId/exercises
//   Body must include exactly one of exerciseId / userExerciseId.
export const createExerciseSchema = z
    .object({
    exerciseId: z.uuid().optional(),
    userExerciseId: z.uuid().optional(),
    targetSets: SETS,
    targetRepsMin: REPS,
    targetRepsMax: REPS,
    targetRpe: RPE.nullable().optional(),
    restSeconds: REST.nullable().optional(),
    notes: NOTES.nullable().optional(),
})
    .refine((d) => !!d.exerciseId !== !!d.userExerciseId, {
    message: "Provide exactly one of exerciseId or userExerciseId",
    path: ["exerciseId"],
})
    .refine((d) => d.targetRepsMax >= d.targetRepsMin, {
    message: "Max reps must be at least min reps",
    path: ["targetRepsMax"],
});
// PATCH /api/v1/workouts/plan/exercises/:planExerciseId
//   Partial — any subset of editable fields. Pass exerciseId or
//   userExerciseId (not both) to swap; pass other fields to edit; or both.
export const updateExerciseSchema = z
    .object({
    exerciseId: z.uuid().optional(),
    userExerciseId: z.uuid().optional(),
    targetSets: SETS.optional(),
    targetRepsMin: REPS.optional(),
    targetRepsMax: REPS.optional(),
    targetRpe: RPE.nullable().optional(),
    restSeconds: REST.nullable().optional(),
    notes: NOTES.nullable().optional(),
})
    .refine((d) => Object.values(d).some((v) => v !== undefined), {
    message: "Send at least one field to update",
})
    .refine((d) => !(d.exerciseId && d.userExerciseId), {
    message: "Send only one of exerciseId or userExerciseId",
    path: ["exerciseId"],
})
    .refine((d) => d.targetRepsMin === undefined ||
    d.targetRepsMax === undefined ||
    d.targetRepsMax >= d.targetRepsMin, {
    message: "Max reps must be at least min reps",
    path: ["targetRepsMax"],
});
// POST /api/v1/workouts/plan/days/:dayId/exercises/reorder
export const reorderExercisesSchema = z
    .array(z.object({
    planExerciseId: z.uuid("Invalid plan_exercise id"),
    position: z.number().int().min(0).max(50),
}))
    .min(1);
//# sourceMappingURL=plan-edit.schemas.js.map