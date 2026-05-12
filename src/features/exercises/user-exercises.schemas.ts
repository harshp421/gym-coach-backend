import { z } from "zod"

const NAME = z.string().trim().min(1, "Name can't be empty").max(80, "Too long")
const MUSCLE = z.string().trim().min(1).max(40)
const PRIMARY_MUSCLES = z.array(MUSCLE).min(1, "Pick at least one muscle").max(5)
const SECONDARY_MUSCLES = z.array(MUSCLE).max(10).default([])
const INSTRUCTIONS = z
    .array(z.string().trim().min(1).max(1000))
    .max(20)
    .default([])
const DEMO_URL = z.string().trim().url().max(500)
const LEVEL = z.enum(["beginner", "intermediate", "advanced"])
const MECHANIC = z.enum(["compound", "isolation"])

export const createUserExerciseSchema = z.object({
    name: NAME,
    primaryMuscles: PRIMARY_MUSCLES,
    secondaryMuscles: SECONDARY_MUSCLES.optional(),
    equipment: z.string().trim().max(40).optional(),
    mechanic: MECHANIC.nullable().optional(),
    level: LEVEL.default("beginner"),
    instructions: INSTRUCTIONS.optional(),
    demoUrl: DEMO_URL.nullable().optional(),
})
export type CreateUserExerciseInput = z.infer<typeof createUserExerciseSchema>

export const updateUserExerciseSchema = z
    .object({
        name: NAME.optional(),
        primaryMuscles: PRIMARY_MUSCLES.optional(),
        secondaryMuscles: SECONDARY_MUSCLES.optional(),
        equipment: z.string().trim().max(40).nullable().optional(),
        mechanic: MECHANIC.nullable().optional(),
        level: LEVEL.optional(),
        instructions: INSTRUCTIONS.optional(),
        demoUrl: DEMO_URL.nullable().optional(),
    })
    .refine((d) => Object.values(d).some((v) => v !== undefined), {
        message: "Send at least one field to update",
    })
export type UpdateUserExerciseInput = z.infer<typeof updateUserExerciseSchema>
