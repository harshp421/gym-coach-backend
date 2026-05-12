import { z } from "zod"

const cookingTimeSchema = z.enum(["quick", "moderate", "leisurely"])
const budgetTierSchema = z.enum(["budget", "mid", "premium"])

// Closed enum for the UI's pill picker. New cuisines can be added here
// without a migration since `cuisines` is just TEXT[] on the DB side.
export const ALLOWED_CUISINES = [
    "indian",
    "mediterranean",
    "american",
    "asian",
    "mexican",
    "italian",
    "middle_eastern",
    "other",
] as const

const cuisineSchema = z.enum(ALLOWED_CUISINES)

const mealsPerDaySchema = z.number().int().min(2).max(6)

const favoriteFoodSchema = z.string().min(1).max(40)
const favoriteFoodsSchema = z.array(favoriteFoodSchema).max(20)

const cuisinesSchema = z.array(cuisineSchema).max(8)

// PUT — every field optional. Used for incremental edits from the diet
// settings page after the user has already completed the questionnaire.
export const updatePreferencesSchema = z.object({
    mealsPerDay: mealsPerDaySchema.optional(),
    cookingTime: cookingTimeSchema.optional(),
    cuisines: cuisinesSchema.optional(),
    budgetTier: budgetTierSchema.optional(),
    favoriteFoods: favoriteFoodsSchema.optional(),
    includeSnacks: z.boolean().optional(),
})

// POST /complete — what the questionnaire submits. Required fields up
// front so we know we have enough to build a useful AI prompt. Server
// stamps completed_at on success.
export const completePreferencesSchema = z.object({
    mealsPerDay: mealsPerDaySchema,
    cookingTime: cookingTimeSchema,
    cuisines: cuisinesSchema.default([]),
    budgetTier: budgetTierSchema,
    favoriteFoods: favoriteFoodsSchema.default([]),
    includeSnacks: z.boolean().default(true),
})

export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>
export type CompletePreferencesInput = z.infer<typeof completePreferencesSchema>

// ---------------------------------------------------------------------------
// AI response validation
//   The Groq response is parsed JSON; we run it through this schema before
//   trusting it. Bounds are generous on individual meals (some plans have
//   ~1500 kcal protein-bombs on one slot) but tight on totals (enforced
//   per-day in plan.service.ts).
// ---------------------------------------------------------------------------
export const mealSchema = z.object({
    dayIndex: z.number().int().min(0).max(6),
    slot: z.string().min(1).max(40),
    name: z.string().min(1).max(120),
    calories: z.number().int().min(0).max(2500),
    proteinG: z.number().min(0).max(250),
    carbsG: z.number().min(0).max(500),
    fatG: z.number().min(0).max(200),
    ingredients: z.array(z.string().min(1).max(200)).min(1).max(20),
    prepNotes: z.string().max(500).nullable().optional(),
})

export const dietPlanResponseSchema = z.object({
    meals: z.array(mealSchema).min(7).max(50),
    notes: z.string().max(500).optional(),
})

export type MealValidated = z.infer<typeof mealSchema>
export type DietPlanResponse = z.infer<typeof dietPlanResponseSchema>
