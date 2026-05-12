import { z } from "zod"

const sexSchema = z.enum(["male", "female", "other"])
const goalSchema = z.enum(["cut", "maintain", "bulk", "recomp"])
const activitySchema = z.enum([
    "sedentary",
    "light",
    "moderate",
    "active",
    "very_active",
])
const experienceSchema = z.enum(["beginner", "intermediate", "advanced"])
const equipmentSchema = z.enum([
    "full_gym",
    "home_basic",
    "dumbbells_only",
    "bodyweight",
])
const dietSchema = z.enum([
    "omnivore",
    "vegetarian",
    "vegan",
    "keto",
    "paleo",
    "other",
])
const unitsSchema = z.enum(["metric", "imperial"])

const dateStringSchema = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date (YYYY-MM-DD)")

// Sane physical bounds, kept in sync with the frontend.
const heightCmField = z.number().positive().max(272)
const weightKgField = z.number().min(20).max(635)

// What the wizard submits at the end. Every field except optional weight/diet
// extras is required so we know we have enough to compute calorie targets.
// `initialWeightKg` becomes the first row in body_metrics.
export const completeOnboardingSchema = z.object({
    dateOfBirth: dateStringSchema,
    sex: sexSchema,
    heightCm: heightCmField,
    initialWeightKg: weightKgField,
    goal: goalSchema,
    targetWeightKg: weightKgField.nullable().optional(),
    activityLevel: activitySchema,
    experienceLevel: experienceSchema,
    trainingDaysPerWeek: z.number().int().min(1).max(7),
    equipmentAccess: equipmentSchema,
    dietType: dietSchema,
    allergies: z.array(z.string().min(1).max(40)).default([]),
    dislikes: z.array(z.string().min(1).max(40)).default([]),
    timezone: z.string().min(1, "Timezone is required"),
    units: unitsSchema.default("metric"),
})

// PUT /profile — partial update (all fields optional, no initial weight here;
// for that hit POST /body-metrics).
export const updateProfileSchema = completeOnboardingSchema
    .partial()
    .omit({ initialWeightKg: true })

export const bodyMetricSchema = z
    .object({
        recordedAt: dateStringSchema.optional(),
        weightKg: weightKgField.nullable().optional(),
        bodyFatPct: z.number().min(2).max(75).nullable().optional(),
        waistCm: z.number().min(20).max(300).nullable().optional(),
        notes: z.string().max(500).nullable().optional(),
    })
    .refine(
        (d) =>
            d.weightKg != null || d.bodyFatPct != null || d.waistCm != null,
        {
            message: "At least one of weight, body fat, or waist is required",
            path: ["weightKg"],
        }
    )

export type CompleteOnboardingInput = z.infer<typeof completeOnboardingSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type BodyMetricInput = z.infer<typeof bodyMetricSchema>
