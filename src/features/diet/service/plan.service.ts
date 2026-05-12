import { pool } from "../../../config/dbConnect.js"
import { HttpError } from "../../../utils/http-error.js"
import { chatCompletion } from "../../coach/service/groq.client.js"
import {
    getOrCreateProfile,
    listBodyMetrics,
} from "../../profile/service/profile.service.js"
import {
    dietPlanResponseSchema,
    type DietPlanResponse,
} from "../diet.schemas.js"
import type { DietPlan, Meal } from "../diet.types.js"
import { buildPrompt } from "./prompt.builder.js"
import { getOrCreatePreferences } from "./preferences.service.js"
import { computeAge, targetsFromProfile, type Targets } from "./targets.service.js"

// Per-day macro tolerance. The model is imperfect at arithmetic; 15%
// catches grossly-off responses while letting reasonable variance through.
// Tightening past ~10% triggers retries on perfectly fine plans.
const PER_DAY_TOLERANCE = 0.15

// Hard caps on the AI call. 7-day prompt + JSON output for ~28 meals fits
// comfortably under 7000 output tokens at 70b. Higher temperature gives
// recipe variety; lower would feel formulaic.
const MAX_OUTPUT_TOKENS = 7000
const TEMPERATURE = 0.7

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------
function mapDietPlan(row: any): DietPlan {
    // `meals` is JSONB; pg auto-parses it into a JS array.
    const meals: Meal[] = Array.isArray(row.meals) ? row.meals : []
    return {
        id: row.id,
        userId: row.user_id,
        status: row.status,
        calorieTarget: row.calorie_target,
        proteinTargetG: row.protein_target_g,
        carbTargetG: row.carb_target_g,
        fatTargetG: row.fat_target_g,
        notes: row.notes,
        meals,
        generatedAt: row.generated_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    }
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------
export async function getActivePlan(userId: string): Promise<DietPlan | null> {
    const r = await pool.query(
        `SELECT * FROM diet_plans WHERE user_id = $1 AND status = 'active'`,
        [userId],
    )
    return r.rows[0] ? mapDietPlan(r.rows[0]) : null
}

// ---------------------------------------------------------------------------
// Generate
//   Loads profile + prefs + latest weight, computes targets, builds the
//   AI prompt, validates the response, and persists atomically. Retries
//   once on parse/validation/balance failure — twice is generous, beyond
//   that the model is consistently confused and we'd rather show an error.
// ---------------------------------------------------------------------------
export async function regeneratePlanForUser(userId: string): Promise<DietPlan> {
    const profile = await getOrCreateProfile(userId)
    const prefs = await getOrCreatePreferences(userId)

    // Gate: incomplete profile means we can't compute calorie targets.
    if (
        !profile.sex ||
        !profile.dateOfBirth ||
        !profile.heightCm ||
        !profile.activityLevel ||
        !profile.goal
    ) {
        throw new HttpError(
            400,
            "Complete your profile before generating a diet plan",
        )
    }

    // Current weight from the latest body_metrics row.
    const metrics = await listBodyMetrics(userId, { limit: 1 })
    const latestWeightKg = metrics[0]?.weightKg
    if (!latestWeightKg) {
        throw new HttpError(
            400,
            "Log your current weight before generating a diet plan",
        )
    }

    const targets = targetsFromProfile({
        profile: {
            sex: profile.sex,
            dateOfBirth: profile.dateOfBirth,
            heightCm: profile.heightCm,
            activityLevel: profile.activityLevel,
            goal: profile.goal,
        },
        currentWeightKg: latestWeightKg,
    })

    const messages = buildPrompt({
        age: computeAge(profile.dateOfBirth),
        sex: profile.sex,
        heightCm: profile.heightCm,
        weightKg: latestWeightKg,
        goal: profile.goal,
        activityLevel: profile.activityLevel,
        targets,
        mealsPerDay: prefs.mealsPerDay,
        cookingTime: prefs.cookingTime,
        cuisines: prefs.cuisines,
        budgetTier: prefs.budgetTier,
        favoriteFoods: prefs.favoriteFoods,
        includeSnacks: prefs.includeSnacks,
        dietType: profile.dietType ?? "omnivore",
        allergies: profile.allergies ?? [],
        dislikes: profile.dislikes ?? [],
        targetWeightKg: profile.targetWeightKg ?? null,
    })

    const MAX_ATTEMPTS = 2
    let lastErr: unknown
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            const raw = await chatCompletion({
                messages,
                temperature: TEMPERATURE,
                maxTokens: MAX_OUTPUT_TOKENS,
                responseFormat: "json_object",
            })
            const parsed = parseAndValidate(raw)
            assertPerDayMacrosOk(parsed, targets, prefs.mealsPerDay)
            return await persistPlan(userId, targets, parsed)
        } catch (err) {
            lastErr = err
            if (attempt >= MAX_ATTEMPTS) break
            console.warn(
                `[diet.generate] attempt ${attempt} failed, retrying:`,
                err instanceof Error ? err.message : err,
            )
        }
    }

    const message =
        lastErr instanceof HttpError
            ? lastErr.message
            : lastErr instanceof Error
              ? lastErr.message
              : "unknown error"
    throw new HttpError(502, `Diet plan generation failed: ${message}`)
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------
function parseAndValidate(raw: string): DietPlanResponse {
    let json: unknown
    try {
        json = JSON.parse(raw)
    } catch {
        throw new Error("AI returned non-JSON")
    }
    const result = dietPlanResponseSchema.safeParse(json)
    if (!result.success) {
        const first = result.error.issues[0]
        throw new Error(
            `AI response failed schema: ${first?.path.join(".")} ${first?.message}`,
        )
    }
    return result.data
}

function assertPerDayMacrosOk(
    response: DietPlanResponse,
    targets: Targets,
    expectedMealsPerDay: number,
): void {
    type DayTotals = {
        calories: number
        proteinG: number
        carbsG: number
        fatG: number
        count: number
    }
    const byDay = new Map<number, DayTotals>()
    for (const m of response.meals) {
        const cur =
            byDay.get(m.dayIndex) ??
            { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, count: 0 }
        cur.calories += m.calories
        cur.proteinG += m.proteinG
        cur.carbsG += m.carbsG
        cur.fatG += m.fatG
        cur.count += 1
        byDay.set(m.dayIndex, cur)
    }

    if (byDay.size !== 7) {
        throw new Error(
            `Plan covers ${byDay.size} days, expected 7 (Mon–Sun)`,
        )
    }

    const within = (actual: number, target: number) =>
        Math.abs(actual - target) / Math.max(target, 1) <= PER_DAY_TOLERANCE

    for (const [day, t] of byDay) {
        if (t.count !== expectedMealsPerDay) {
            throw new Error(
                `Day ${day} has ${t.count} meals, expected ${expectedMealsPerDay}`,
            )
        }
        if (!within(t.calories, targets.calorieTarget)) {
            throw new Error(
                `Day ${day} calories ${t.calories} out of range (target ${targets.calorieTarget} ±${PER_DAY_TOLERANCE * 100}%)`,
            )
        }
        if (!within(t.proteinG, targets.proteinTargetG)) {
            throw new Error(
                `Day ${day} protein ${t.proteinG}g out of range (target ${targets.proteinTargetG}g)`,
            )
        }
        if (!within(t.carbsG, targets.carbTargetG)) {
            throw new Error(
                `Day ${day} carbs ${t.carbsG}g out of range (target ${targets.carbTargetG}g)`,
            )
        }
        if (!within(t.fatG, targets.fatTargetG)) {
            throw new Error(
                `Day ${day} fat ${t.fatG}g out of range (target ${targets.fatTargetG}g)`,
            )
        }
    }
}

// ---------------------------------------------------------------------------
// Persist
//   Archive previous active + insert new in one transaction so the user
//   never has two active plans (the partial unique index would reject
//   anyway, but explicit archive keeps history visible if we surface it).
// ---------------------------------------------------------------------------
async function persistPlan(
    userId: string,
    targets: Targets,
    response: DietPlanResponse,
): Promise<DietPlan> {
    const client = await pool.connect()
    try {
        await client.query("BEGIN")
        await client.query(
            `UPDATE diet_plans SET status = 'archived'
             WHERE user_id = $1 AND status = 'active'`,
            [userId],
        )
        const r = await client.query(
            `INSERT INTO diet_plans (
                user_id, calorie_target, protein_target_g,
                carb_target_g, fat_target_g, notes, meals
             ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
             RETURNING *`,
            [
                userId,
                targets.calorieTarget,
                targets.proteinTargetG,
                targets.carbTargetG,
                targets.fatTargetG,
                response.notes ?? null,
                JSON.stringify(response.meals),
            ],
        )
        await client.query("COMMIT")
        return mapDietPlan(r.rows[0])
    } catch (err) {
        await client.query("ROLLBACK")
        throw err
    } finally {
        client.release()
    }
}
