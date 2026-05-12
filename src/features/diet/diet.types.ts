export type CookingTime = "quick" | "moderate" | "leisurely"
export type BudgetTier = "budget" | "mid" | "premium"

// Free-form cuisine tags (we don't enforce a closed enum at the DB level so
// new options can drop in without a migration). The schema layer validates
// against ALLOWED_CUISINES on input.
export type Cuisine = string

export type DietPreferences = {
    userId: string
    mealsPerDay: number
    cookingTime: CookingTime
    cuisines: Cuisine[]
    budgetTier: BudgetTier
    favoriteFoods: string[]
    includeSnacks: boolean
    completedAt: Date | null
    createdAt: Date
    updatedAt: Date
}

// One meal in the JSONB array on diet_plans.meals.
// `slot` is free-form so the AI can use whatever fits (breakfast / pre-workout
// / late snack), but we cap it short.
export type Meal = {
    dayIndex: number // 0..6 = Mon..Sun
    slot: string
    name: string
    calories: number
    proteinG: number
    carbsG: number
    fatG: number
    ingredients: string[]
    prepNotes: string | null
}

export type DietPlan = {
    id: string
    userId: string
    status: "active" | "archived"
    calorieTarget: number
    proteinTargetG: number
    carbTargetG: number
    fatTargetG: number
    notes: string | null
    meals: Meal[]
    generatedAt: Date
    createdAt: Date
    updatedAt: Date
}
