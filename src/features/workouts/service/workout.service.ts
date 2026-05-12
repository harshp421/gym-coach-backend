import { pool } from "../../../config/dbConnect.js"
import { HttpError } from "../../../utils/http-error.js"
import {
    EQUIPMENT_ALLOWED,
    LEVEL_ALLOWED,
    generatePlan,
} from "./generator.service.js"
import { listForGenerator } from "../../exercises/service/exercises.service.js"
import { getOrCreateProfile } from "../../profile/service/profile.service.js"
import type { Exercise } from "../../exercises/exercises.types.js"
import type {
    GeneratedPlan,
    PlanDay,
    PlanExercise,
    SplitType,
    WorkoutPlan,
} from "../workout.types.js"

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

function mapPlanRow(row: any): Omit<WorkoutPlan, "days"> {
    return {
        id: row.id,
        userId: row.user_id,
        status: row.status,
        splitType: row.split_type as SplitType,
        daysPerWeek: row.days_per_week,
        goal: row.goal,
        name: row.name ?? null,
        notes: row.notes,
        generatedAt: row.generated_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    }
}

function mapDayRow(row: any): Omit<PlanDay, "exercises"> {
    return {
        id: row.id,
        planId: row.plan_id,
        dayIndex: row.day_index,
        name: row.name,
        weekdayHint: row.weekday_hint,
    }
}

function mapPlanExerciseRow(row: any, exercise: Exercise): PlanExercise {
    return {
        id: row.id,
        planDayId: row.plan_day_id,
        position: row.position,
        targetSets: row.target_sets,
        targetRepsMin: row.target_reps_min,
        targetRepsMax: row.target_reps_max,
        targetRpe: row.target_rpe == null ? null : Number(row.target_rpe),
        restSeconds: row.rest_seconds,
        notes: row.notes,
        exercise,
    }
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

// Returns the user's active plan with all days + plan_exercises hydrated with
// their full Exercise records. Single trip: 3 queries (plan, days, exercises).
export async function getActivePlan(userId: string): Promise<WorkoutPlan | null> {
    const planResult = await pool.query(
        `SELECT * FROM workout_plans WHERE user_id = $1 AND status = 'active'`,
        [userId]
    )
    const planRow = planResult.rows[0]
    if (!planRow) return null

    const daysResult = await pool.query(
        `SELECT * FROM plan_days WHERE plan_id = $1 ORDER BY day_index ASC`,
        [planRow.id]
    )
    const dayRows = daysResult.rows
    if (dayRows.length === 0) {
        return { ...mapPlanRow(planRow), days: [] }
    }

    const dayIds = dayRows.map((d) => d.id)
    // LEFT JOIN both catalogs and tag origin in SQL so the row mapper can
    // pick the right side without a follow-up query per exercise.
    const peResult = await pool.query(
        `SELECT pe.id            AS pe_id,
                pe.plan_day_id   AS pe_plan_day_id,
                pe.position      AS pe_position,
                pe.target_sets, pe.target_reps_min, pe.target_reps_max,
                pe.target_rpe, pe.rest_seconds, pe.notes,
                pe.exercise_id, pe.user_exercise_id,
                e.external_id, e.slug AS sys_slug, e.name AS sys_name,
                e.force, e.level AS sys_level, e.mechanic AS sys_mechanic,
                e.equipment AS sys_equipment, e.category,
                e.primary_muscles AS sys_primary, e.secondary_muscles AS sys_secondary,
                e.instructions AS sys_instructions, e.image_urls,
                e.created_at AS sys_created_at, e.updated_at AS sys_updated_at,
                ue.slug AS ue_slug, ue.name AS ue_name,
                ue.level AS ue_level, ue.mechanic AS ue_mechanic,
                ue.equipment AS ue_equipment,
                ue.primary_muscles AS ue_primary, ue.secondary_muscles AS ue_secondary,
                ue.instructions AS ue_instructions,
                ue.created_at AS ue_created_at, ue.updated_at AS ue_updated_at
         FROM plan_exercises pe
         LEFT JOIN exercises e       ON e.id = pe.exercise_id
         LEFT JOIN user_exercises ue ON ue.id = pe.user_exercise_id
         WHERE pe.plan_day_id = ANY($1::uuid[])
         ORDER BY pe.plan_day_id, pe.position ASC`,
        [dayIds],
    )

    // Group plan_exercises by plan_day_id.
    const byDay = new Map<string, PlanExercise[]>()
    for (const row of peResult.rows) {
        const fromSystem = row.exercise_id != null
        const exercise: Exercise = fromSystem
            ? {
                  id: row.exercise_id,
                  externalId: row.external_id,
                  slug: row.sys_slug,
                  name: row.sys_name,
                  force: row.force,
                  level: row.sys_level,
                  mechanic: row.sys_mechanic,
                  equipment: row.sys_equipment,
                  category: row.category,
                  primaryMuscles: row.sys_primary ?? [],
                  secondaryMuscles: row.sys_secondary ?? [],
                  instructions: row.sys_instructions ?? [],
                  imageUrls: row.image_urls ?? [],
                  origin: "system",
                  createdAt: row.sys_created_at,
                  updatedAt: row.sys_updated_at,
              }
            : {
                  id: row.user_exercise_id,
                  externalId: null,
                  slug: row.ue_slug,
                  name: row.ue_name,
                  force: null,
                  level: row.ue_level,
                  mechanic: row.ue_mechanic,
                  equipment: row.ue_equipment,
                  category: "strength",
                  primaryMuscles: row.ue_primary ?? [],
                  secondaryMuscles: row.ue_secondary ?? [],
                  instructions: row.ue_instructions ?? [],
                  imageUrls: [],
                  origin: "user",
                  createdAt: row.ue_created_at,
                  updatedAt: row.ue_updated_at,
              }
        const peRow = {
            id: row.pe_id,
            plan_day_id: row.pe_plan_day_id,
            position: row.pe_position,
            target_sets: row.target_sets,
            target_reps_min: row.target_reps_min,
            target_reps_max: row.target_reps_max,
            target_rpe: row.target_rpe,
            rest_seconds: row.rest_seconds,
            notes: row.notes,
        }
        const list = byDay.get(row.pe_plan_day_id) ?? []
        list.push(mapPlanExerciseRow(peRow, exercise))
        byDay.set(row.pe_plan_day_id, list)
    }

    const days: PlanDay[] = dayRows.map((d) => ({
        ...mapDayRow(d),
        exercises: byDay.get(d.id) ?? [],
    }))

    return { ...mapPlanRow(planRow), days }
}

// ---------------------------------------------------------------------------
// Generate + persist
// ---------------------------------------------------------------------------

export async function regeneratePlanForUser(
    userId: string
): Promise<WorkoutPlan> {
    const profile = await getOrCreateProfile(userId)

    if (
        !profile.experienceLevel ||
        !profile.trainingDaysPerWeek ||
        !profile.equipmentAccess ||
        !profile.goal
    ) {
        throw new HttpError(
            400,
            "Complete onboarding before generating a plan"
        )
    }

    const allowedEquipment = EQUIPMENT_ALLOWED[profile.equipmentAccess]
    const allowedLevels = LEVEL_ALLOWED[profile.experienceLevel]

    const exercises = await listForGenerator({ allowedEquipment, allowedLevels })
    if (exercises.length === 0) {
        throw new HttpError(
            500,
            "No exercises match your equipment + level — seed may be missing"
        )
    }

    const generated = generatePlan(
        {
            experienceLevel: profile.experienceLevel,
            trainingDaysPerWeek: profile.trainingDaysPerWeek,
            equipmentAccess: profile.equipmentAccess,
            goal: profile.goal,
        },
        exercises
    )

    return persistGeneratedPlan(userId, generated)
}

export async function persistGeneratedPlan(
    userId: string,
    generated: GeneratedPlan
): Promise<WorkoutPlan> {
    const client = await pool.connect()
    try {
        await client.query("BEGIN")

        // Archive any existing active plan.
        await client.query(
            `UPDATE workout_plans SET status = 'archived'
             WHERE user_id = $1 AND status = 'active'`,
            [userId]
        )

        // Insert the new plan.
        const planInsert = await client.query(
            `INSERT INTO workout_plans
                 (user_id, split_type, days_per_week, goal)
             VALUES ($1, $2, $3, $4)
             RETURNING id`,
            [userId, generated.splitType, generated.daysPerWeek, generated.goal]
        )
        const planId: string = planInsert.rows[0].id

        // Insert days + exercises.
        for (const day of generated.days) {
            const dayInsert = await client.query(
                `INSERT INTO plan_days (plan_id, day_index, name, weekday_hint)
                 VALUES ($1, $2, $3, $4)
                 RETURNING id`,
                [planId, day.dayIndex, day.name, day.weekdayHint]
            )
            const dayId: string = dayInsert.rows[0].id

            for (const ex of day.exercises) {
                await client.query(
                    `INSERT INTO plan_exercises (
                        plan_day_id, exercise_id, position,
                        target_sets, target_reps_min, target_reps_max,
                        target_rpe, rest_seconds
                     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                    [
                        dayId,
                        ex.exerciseId,
                        ex.position,
                        ex.targetSets,
                        ex.targetRepsMin,
                        ex.targetRepsMax,
                        ex.targetRpe,
                        ex.restSeconds,
                    ]
                )
            }
        }

        await client.query("COMMIT")
    } catch (err) {
        await client.query("ROLLBACK")
        throw err
    } finally {
        client.release()
    }

    const plan = await getActivePlan(userId)
    if (!plan) {
        throw new HttpError(500, "Failed to load freshly generated plan")
    }
    return plan
}

// ---------------------------------------------------------------------------
// Today
// ---------------------------------------------------------------------------

/**
 * Picks the plan day whose effective weekday matches today.
 *
 * Effective weekday = `weekday_hint` when set, else `day_index % 7`. Same
 * convention as the frontend's DaySession card so the dashboard and plan
 * page agree on what "today" is. Mon=0..Sun=6 throughout (JS Date.getDay
 * uses Sun=0, so we shift it).
 *
 * Returns null when no day matches → true rest day.
 */
export async function getTodayForUser(userId: string): Promise<{
    day: PlanDay | null
}> {
    const plan = await getActivePlan(userId)
    if (!plan) return { day: null }

    const todayMon0 = (new Date().getDay() + 6) % 7
    const match = plan.days.find(
        (d) => (d.weekdayHint ?? d.dayIndex % 7) === todayMon0,
    )
    return { day: match ?? null }
}

// Swap moved to plan-edit.service.updateExercise — that path now handles
// both the swap (`{ exerciseId }`) and partial edits in one endpoint.
