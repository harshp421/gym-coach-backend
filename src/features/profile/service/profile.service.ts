import { pool } from "../../../config/dbConnect.js"
import type { Profile, BodyMetric } from "../profile.types.js"
import type {
    BodyMetricInput,
    CompleteOnboardingInput,
    UpdateProfileInput,
} from "../profile.schemas.js"

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

// pg returns DATE columns as JS Date objects in local TZ; that confuses JSON
// downstream. Normalize to 'YYYY-MM-DD' strings.
function toIsoDate(value: Date | string | null): string | null {
    if (value == null) return null
    if (typeof value === "string") return value
    return value.toISOString().slice(0, 10)
}

// pg returns NUMERIC as strings to preserve precision. Convert to number.
function toNumber(value: string | number | null): number | null {
    if (value == null) return null
    return typeof value === "string" ? Number(value) : value
}

function mapProfile(row: any): Profile {
    return {
        userId: row.user_id,
        dateOfBirth: toIsoDate(row.date_of_birth),
        sex: row.sex,
        heightCm: toNumber(row.height_cm),
        goal: row.goal,
        targetWeightKg: toNumber(row.target_weight_kg),
        activityLevel: row.activity_level,
        experienceLevel: row.experience_level,
        trainingDaysPerWeek: row.training_days_per_week,
        equipmentAccess: row.equipment_access,
        dietType: row.diet_type,
        allergies: row.allergies ?? [],
        dislikes: row.dislikes ?? [],
        timezone: row.timezone,
        units: row.units,
        onboardingCompletedAt: row.onboarding_completed_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    }
}

function mapBodyMetric(row: any): BodyMetric {
    return {
        id: row.id,
        userId: row.user_id,
        recordedAt: toIsoDate(row.recorded_at) as string,
        weightKg: toNumber(row.weight_kg),
        bodyFatPct: toNumber(row.body_fat_pct),
        waistCm: toNumber(row.waist_cm),
        notes: row.notes,
        createdAt: row.created_at,
    }
}

// ---------------------------------------------------------------------------
// Profile queries
// ---------------------------------------------------------------------------

// Returns the user's profile, creating an empty row on first access.
// Idempotent thanks to ON CONFLICT DO NOTHING.
export async function getOrCreateProfile(userId: string): Promise<Profile> {
    await pool.query(
        `INSERT INTO profiles (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
        [userId]
    )
    const result = await pool.query(`SELECT * FROM profiles WHERE user_id = $1`, [
        userId,
    ])
    return mapProfile(result.rows[0])
}

// Field name → column name. Drives the dynamic UPDATE in updateProfile.
const FIELD_TO_COLUMN: Record<keyof UpdateProfileInput, string> = {
    dateOfBirth: "date_of_birth",
    sex: "sex",
    heightCm: "height_cm",
    goal: "goal",
    targetWeightKg: "target_weight_kg",
    activityLevel: "activity_level",
    experienceLevel: "experience_level",
    trainingDaysPerWeek: "training_days_per_week",
    equipmentAccess: "equipment_access",
    dietType: "diet_type",
    allergies: "allergies",
    dislikes: "dislikes",
    timezone: "timezone",
    units: "units",
}

// Partial update. Only fields explicitly provided in the body are touched.
export async function updateProfile(
    userId: string,
    input: UpdateProfileInput
): Promise<Profile> {
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
        return getOrCreateProfile(userId)
    }

    // Make sure a row exists for this user before we UPDATE.
    await pool.query(
        `INSERT INTO profiles (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
        [userId]
    )

    values.push(userId)
    const result = await pool.query(
        `UPDATE profiles SET ${setClauses.join(", ")}
         WHERE user_id = $${i}
         RETURNING *`,
        values
    )
    return mapProfile(result.rows[0])
}

// Atomic "finish the wizard": upsert profile + insert today's body metric +
// stamp onboarding_completed_at. All-or-nothing.
export async function completeOnboarding(
    userId: string,
    input: CompleteOnboardingInput
): Promise<{ profile: Profile; bodyMetric: BodyMetric }> {
    const today = new Date().toISOString().slice(0, 10)
    const client = await pool.connect()
    try {
        await client.query("BEGIN")

        const profileResult = await client.query(
            `INSERT INTO profiles (
                user_id, date_of_birth, sex, height_cm,
                goal, target_weight_kg, activity_level,
                experience_level, training_days_per_week, equipment_access,
                diet_type, allergies, dislikes,
                timezone, units, onboarding_completed_at
             ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, now()
             )
             ON CONFLICT (user_id) DO UPDATE SET
                date_of_birth = EXCLUDED.date_of_birth,
                sex = EXCLUDED.sex,
                height_cm = EXCLUDED.height_cm,
                goal = EXCLUDED.goal,
                target_weight_kg = EXCLUDED.target_weight_kg,
                activity_level = EXCLUDED.activity_level,
                experience_level = EXCLUDED.experience_level,
                training_days_per_week = EXCLUDED.training_days_per_week,
                equipment_access = EXCLUDED.equipment_access,
                diet_type = EXCLUDED.diet_type,
                allergies = EXCLUDED.allergies,
                dislikes = EXCLUDED.dislikes,
                timezone = EXCLUDED.timezone,
                units = EXCLUDED.units,
                onboarding_completed_at = now()
             RETURNING *`,
            [
                userId,
                input.dateOfBirth,
                input.sex,
                input.heightCm,
                input.goal,
                input.targetWeightKg ?? null,
                input.activityLevel,
                input.experienceLevel,
                input.trainingDaysPerWeek,
                input.equipmentAccess,
                input.dietType,
                input.allergies ?? [],
                input.dislikes ?? [],
                input.timezone,
                input.units ?? "metric",
            ]
        )

        const metricResult = await client.query(
            `INSERT INTO body_metrics (user_id, recorded_at, weight_kg)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id, recorded_at) DO UPDATE SET
                 weight_kg = EXCLUDED.weight_kg
             RETURNING *`,
            [userId, today, input.initialWeightKg]
        )

        await client.query("COMMIT")

        return {
            profile: mapProfile(profileResult.rows[0]),
            bodyMetric: mapBodyMetric(metricResult.rows[0]),
        }
    } catch (err) {
        await client.query("ROLLBACK")
        throw err
    } finally {
        client.release()
    }
}

// ---------------------------------------------------------------------------
// Body metrics queries
// ---------------------------------------------------------------------------

export async function listBodyMetrics(
    userId: string,
    opts: { limit: number; before?: string }
): Promise<BodyMetric[]> {
    const params: any[] = [userId]
    let where = `WHERE user_id = $1`
    if (opts.before) {
        params.push(opts.before)
        where += ` AND recorded_at < $${params.length}`
    }
    params.push(opts.limit)
    const result = await pool.query(
        `SELECT * FROM body_metrics ${where}
         ORDER BY recorded_at DESC
         LIMIT $${params.length}`,
        params
    )
    return result.rows.map(mapBodyMetric)
}

// UPSERT — one row per user per day. COALESCE keeps existing values for any
// metric not provided in this call (so logging weight then later body fat
// merges into the same day's row).
export async function upsertBodyMetric(
    userId: string,
    input: BodyMetricInput
): Promise<BodyMetric> {
    const recordedAt = input.recordedAt ?? new Date().toISOString().slice(0, 10)
    const result = await pool.query(
        `INSERT INTO body_metrics (
            user_id, recorded_at, weight_kg, body_fat_pct, waist_cm, notes
         ) VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (user_id, recorded_at) DO UPDATE SET
             weight_kg    = COALESCE(EXCLUDED.weight_kg, body_metrics.weight_kg),
             body_fat_pct = COALESCE(EXCLUDED.body_fat_pct, body_metrics.body_fat_pct),
             waist_cm     = COALESCE(EXCLUDED.waist_cm, body_metrics.waist_cm),
             notes        = COALESCE(EXCLUDED.notes, body_metrics.notes)
         RETURNING *`,
        [
            userId,
            recordedAt,
            input.weightKg ?? null,
            input.bodyFatPct ?? null,
            input.waistCm ?? null,
            input.notes ?? null,
        ]
    )
    return mapBodyMetric(result.rows[0])
}
