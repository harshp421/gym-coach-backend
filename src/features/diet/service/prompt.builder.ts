// Builds the system + user messages for the Groq diet-plan call. Kept as
// pure functions so the prompt is testable / reproducible without hitting
// the AI. Output shape matches `dietPlanResponseSchema`.

import type { GroqMessage } from "../../coach/service/groq.client.js"
import type { Targets } from "./targets.service.js"

export type PromptInputs = {
    age: number
    sex: "male" | "female" | "other"
    heightCm: number
    weightKg: number
    goal: "cut" | "maintain" | "bulk" | "recomp"
    activityLevel: string
    targets: Targets

    // Prefs
    mealsPerDay: number
    cookingTime: "quick" | "moderate" | "leisurely"
    cuisines: string[]
    budgetTier: "budget" | "mid" | "premium"
    favoriteFoods: string[]
    includeSnacks: boolean

    // Profile diet bits
    dietType: string
    allergies: string[]
    dislikes: string[]
    targetWeightKg?: number | null
}

// Kept terse on purpose: every token in the system prompt counts against
// the Groq TPM budget on every call. Schema/rules pared down to the
// minimum the model still respects reliably.
const SYSTEM_PROMPT = `You are a nutritionist. Output strict JSON only (no prose, no markdown).

Shape: {"meals":[{"dayIndex":0..6,"slot":"breakfast|lunch|dinner|snack|pre-workout|post-workout","name":"string","calories":int,"proteinG":int,"carbsG":int,"fatG":int,"ingredients":["200g chicken","1 cup rice"],"prepNotes":"one sentence or null"}],"notes":"one line"}

Rules:
- Exactly 7 days (dayIndex 0..6), each with the requested meals/day count.
- Each day's macro totals within 10% of the user's targets. Verify P×4+C×4+F×9≈cals.
- Never use listed allergens/dislikes. Respect diet type strictly.
- Ingredients include weights (e.g. "200g chicken"). Vary across days; reuse staples ok.`

export function buildPrompt(input: PromptInputs): GroqMessage[] {
    const userMessage = renderUserMessage(input)
    return [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
    ]
}

function renderUserMessage(i: PromptInputs): string {
    const lines: string[] = []

    lines.push("Plan a 7-day diet for the user below. Output JSON only.")
    lines.push("")
    lines.push("USER PROFILE")
    lines.push(`- age: ${i.age}, sex: ${i.sex}, height: ${i.heightCm} cm, weight: ${i.weightKg} kg`)
    lines.push(`- goal: ${i.goal}${i.targetWeightKg ? ` (target ${i.targetWeightKg} kg)` : ""}`)
    lines.push(`- activity level: ${i.activityLevel}`)
    lines.push("")
    lines.push("DAILY TARGETS (each of the 7 days, ±5%)")
    lines.push(`- calories: ${i.targets.calorieTarget} kcal`)
    lines.push(`- protein:  ${i.targets.proteinTargetG} g`)
    lines.push(`- carbs:    ${i.targets.carbTargetG} g`)
    lines.push(`- fat:      ${i.targets.fatTargetG} g`)
    lines.push("")
    lines.push("PREFERENCES")
    lines.push(`- meals per day: ${i.mealsPerDay}${i.includeSnacks ? " (snacks ok)" : " (no snacks)"}`)
    lines.push(`- cooking time:  ${cookingTimeLabel(i.cookingTime)}`)
    lines.push(`- cuisines:      ${listOrNone(i.cuisines)}`)
    lines.push(`- budget:        ${budgetLabel(i.budgetTier)}`)
    lines.push(`- favorite foods: ${listOrNone(i.favoriteFoods)}`)
    lines.push("")
    lines.push("DIET CONSTRAINTS — HARD RULES, NEVER VIOLATE")
    lines.push(`- diet type:  ${i.dietType}`)
    lines.push(`- allergies:  ${listOrNone(i.allergies)}`)
    lines.push(`- dislikes:   ${listOrNone(i.dislikes)}`)
    lines.push("")
    lines.push("Now emit the JSON.")

    return lines.join("\n")
}

function cookingTimeLabel(t: "quick" | "moderate" | "leisurely"): string {
    if (t === "quick") return "quick (≤15 min per meal)"
    if (t === "moderate") return "moderate (15–30 min per meal)"
    return "leisurely (30+ min ok, willing to cook properly)"
}

function budgetLabel(b: "budget" | "mid" | "premium"): string {
    if (b === "budget") return "budget (stick to staples)"
    if (b === "mid") return "mid (everyday groceries)"
    return "premium (no constraint)"
}

function listOrNone(xs: string[]): string {
    return xs.length === 0 ? "(none)" : xs.join(", ")
}
