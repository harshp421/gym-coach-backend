import { pool } from "../../../config/dbConnect.js"
import type { DietPreferences } from "../diet.types.js"
import type {
    CompletePreferencesInput,
    UpdatePreferencesInput,
} from "../diet.schemas.js"

function mapPreferences(row: any): DietPreferences {
    return {
        userId: row.user_id,
        mealsPerDay: row.meals_per_day,
        cookingTime: row.cooking_time,
        cuisines: row.cuisines ?? [],
        budgetTier: row.budget_tier,
        favoriteFoods: row.favorite_foods ?? [],
        includeSnacks: row.include_snacks,
        completedAt: row.completed_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    }
}

// First read also creates the row using DB defaults — so the frontend can
// always render a sensible form on first visit, even before the user has
// answered anything. `completed_at` stays NULL until they submit.
export async function getOrCreatePreferences(
    userId: string,
): Promise<DietPreferences> {
    await pool.query(
        `INSERT INTO diet_preferences (user_id) VALUES ($1)
         ON CONFLICT (user_id) DO NOTHING`,
        [userId],
    )
    const r = await pool.query(
        `SELECT * FROM diet_preferences WHERE user_id = $1`,
        [userId],
    )
    return mapPreferences(r.rows[0])
}

// Camel → snake mapping for the dynamic UPDATE. Keys here drive what fields
// are settable via the PATCH-like PUT endpoint.
const FIELD_TO_COLUMN: Record<keyof UpdatePreferencesInput, string> = {
    mealsPerDay: "meals_per_day",
    cookingTime: "cooking_time",
    cuisines: "cuisines",
    budgetTier: "budget_tier",
    favoriteFoods: "favorite_foods",
    includeSnacks: "include_snacks",
}

// Partial update — only fields explicitly present in `input` are touched.
// completed_at is intentionally never set here; that's the questionnaire's job.
export async function updatePreferences(
    userId: string,
    input: UpdatePreferencesInput,
): Promise<DietPreferences> {
    const setClauses: string[] = []
    const values: any[] = []
    let i = 1

    for (const [key, column] of Object.entries(FIELD_TO_COLUMN)) {
        const value = (input as any)[key]
        if (value !== undefined) {
            setClauses.push(`${column} = $${i++}`)
            values.push(value)
        }
    }

    if (setClauses.length === 0) {
        return getOrCreatePreferences(userId)
    }

    // Ensure a row exists before UPDATE so first-touch edits aren't no-ops.
    await pool.query(
        `INSERT INTO diet_preferences (user_id) VALUES ($1)
         ON CONFLICT (user_id) DO NOTHING`,
        [userId],
    )

    values.push(userId)
    const r = await pool.query(
        `UPDATE diet_preferences SET ${setClauses.join(", ")}
         WHERE user_id = $${i}
         RETURNING *`,
        values,
    )
    return mapPreferences(r.rows[0])
}

// Questionnaire submission — UPSERTs the row with all required fields
// and stamps completed_at = now() so the route gate stops redirecting.
export async function completePreferences(
    userId: string,
    input: CompletePreferencesInput,
): Promise<DietPreferences> {
    const r = await pool.query(
        `INSERT INTO diet_preferences (
            user_id, meals_per_day, cooking_time, cuisines,
            budget_tier, favorite_foods, include_snacks, completed_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, now())
         ON CONFLICT (user_id) DO UPDATE SET
            meals_per_day  = EXCLUDED.meals_per_day,
            cooking_time   = EXCLUDED.cooking_time,
            cuisines       = EXCLUDED.cuisines,
            budget_tier    = EXCLUDED.budget_tier,
            favorite_foods = EXCLUDED.favorite_foods,
            include_snacks = EXCLUDED.include_snacks,
            completed_at   = now()
         RETURNING *`,
        [
            userId,
            input.mealsPerDay,
            input.cookingTime,
            input.cuisines,
            input.budgetTier,
            input.favoriteFoods,
            input.includeSnacks,
        ],
    )
    return mapPreferences(r.rows[0])
}
