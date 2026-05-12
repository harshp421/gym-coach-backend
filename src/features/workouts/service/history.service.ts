import { pool } from "../../../config/dbConnect.js"
import { HttpError } from "../../../utils/http-error.js"
import type {
    ExerciseHistoryEntry,
    SetLog,
    SetLogWithPr,
    WorkoutSession,
    WorkoutSessionListItem,
} from "../sessions.types.js"

function toNumber(value: string | number | null): number | null {
    if (value == null) return null
    return typeof value === "string" ? Number(value) : value
}

function mapSession(row: any): WorkoutSession {
    return {
        id: row.id,
        userId: row.user_id,
        planId: row.plan_id,
        planDayId: row.plan_day_id,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    }
}

function mapSetLog(row: any): SetLog {
    return {
        id: row.id,
        sessionId: row.session_id,
        planExerciseId: row.plan_exercise_id,
        setNumber: row.set_number,
        weightKg: toNumber(row.weight_kg),
        reps: row.reps,
        rpe: toNumber(row.rpe),
        notes: row.notes,
        loggedAt: row.logged_at,
    }
}

// Epley formula — the standard 1RM estimate. Lets PR detection compare a
// 100kg×5 vs a 90kg×8 honestly instead of just looking at weight.
function epley(weightKg: number, reps: number): number {
    return weightKg * (1 + reps / 30)
}

// ---------------------------------------------------------------------------
// Recent sessions list with per-session aggregates (sets, reps, volume).
// LEFT JOIN + GROUP BY so sessions with no logged sets still appear with
// zeroed summary.
// ---------------------------------------------------------------------------

export async function listRecentSessions(
    userId: string,
    opts: { limit: number; before?: string }
): Promise<{ items: WorkoutSessionListItem[]; nextBefore: string | null }> {
    const params: any[] = [userId]
    let where = `WHERE ws.user_id = $1`
    if (opts.before) {
        params.push(opts.before)
        where += ` AND ws.started_at < $${params.length}`
    }
    // Fetch limit + 1 to know if there's another page.
    params.push(opts.limit + 1)
    const result = await pool.query(
        `SELECT ws.*,
                COALESCE(COUNT(sl.id),                 0)::int      AS total_sets,
                COALESCE(SUM(sl.reps),                 0)::int      AS total_reps,
                COALESCE(SUM(sl.weight_kg * sl.reps),  0)::numeric  AS total_volume_kg
         FROM workout_sessions ws
         LEFT JOIN set_logs sl ON sl.session_id = ws.id
         ${where}
         GROUP BY ws.id
         ORDER BY ws.started_at DESC
         LIMIT $${params.length}`,
        params
    )

    const rows = result.rows.slice(0, opts.limit)
    const items: WorkoutSessionListItem[] = rows.map((row) => ({
        ...mapSession(row),
        summary: {
            totalSets: row.total_sets,
            totalReps: row.total_reps,
            totalVolumeKg: toNumber(row.total_volume_kg) ?? 0,
        },
    }))

    const nextBefore =
        result.rows.length > opts.limit
            ? rows[rows.length - 1]?.started_at?.toISOString?.() ??
              String(rows[rows.length - 1]?.started_at ?? "")
            : null

    return { items, nextBefore: nextBefore || null }
}

// ---------------------------------------------------------------------------
// Per-exercise history — dereferences a plan_exercise to its underlying
// catalog id (either exercises.id for system, or user_exercises.id for
// user-authored) so history survives plan regeneration and swap, and
// shows up regardless of which catalog the prescription pointed at on
// each occasion. Adds an `isPr` flag computed via Epley running max
// across the returned window.
// ---------------------------------------------------------------------------

export async function getExerciseHistory(
    userId: string,
    planExerciseId: string,
    limit: number
): Promise<{ items: ExerciseHistoryEntry[] }> {
    // Look up the underlying catalog id (one and only one of these is
    // set thanks to the plan_exercises_one_source_chk CHECK constraint),
    // scoped to this user via the join chain.
    const lookup = await pool.query(
        `SELECT pe.exercise_id, pe.user_exercise_id
         FROM plan_exercises pe
         JOIN plan_days pd ON pd.id = pe.plan_day_id
         JOIN workout_plans wp ON wp.id = pd.plan_id
         WHERE pe.id = $1 AND wp.user_id = $2`,
        [planExerciseId, userId]
    )
    if (!lookup.rows[0]) throw new HttpError(404, "Exercise not found")
    const sysId: string | null = lookup.rows[0].exercise_id
    const userExId: string | null = lookup.rows[0].user_exercise_id

    // Match plan_exercises whose underlying catalog id is the same as our
    // target's. Pass both params + pick at query time so the SQL doesn't
    // have to branch.
    const sessionRows = await pool.query(
        `SELECT DISTINCT ws.id, ws.started_at, ws.completed_at
         FROM workout_sessions ws
         JOIN set_logs sl       ON sl.session_id = ws.id
         JOIN plan_exercises pe ON pe.id = sl.plan_exercise_id
         WHERE ws.user_id = $1
           AND (
             ($2::uuid IS NOT NULL AND pe.exercise_id      = $2)
          OR ($3::uuid IS NOT NULL AND pe.user_exercise_id = $3)
           )
         ORDER BY ws.started_at DESC
         LIMIT $4`,
        [userId, sysId, userExId, limit]
    )
    if (sessionRows.rows.length === 0) return { items: [] }

    const sessionIds = sessionRows.rows.map((r) => r.id) as string[]
    const setRows = await pool.query(
        `SELECT sl.*
         FROM set_logs sl
         JOIN plan_exercises pe ON pe.id = sl.plan_exercise_id
         WHERE sl.session_id = ANY($1::uuid[])
           AND (
             ($2::uuid IS NOT NULL AND pe.exercise_id      = $2)
          OR ($3::uuid IS NOT NULL AND pe.user_exercise_id = $3)
           )
         ORDER BY sl.logged_at ASC`,
        [sessionIds, sysId, userExId]
    )

    // PR flagging: walk sets chronologically across the returned window,
    // mark each set as PR if its Epley e1RM beats the running best.
    // Note: this is "PR within the returned window" — older PRs that fell
    // off the limit-N window would re-appear. Acceptable for v1; revisit
    // if user history routinely exceeds the window.
    let bestE1RM = 0
    const isPrById = new Map<string, boolean>()
    for (const row of setRows.rows) {
        const w = toNumber(row.weight_kg)
        if (w === null || w <= 0) {
            isPrById.set(row.id, false)
            continue
        }
        const e1rm = epley(w, row.reps)
        const isPr = e1rm > bestE1RM + 0.0001
        if (isPr) bestE1RM = e1rm
        isPrById.set(row.id, isPr)
    }

    const setsBySession = new Map<string, SetLogWithPr[]>()
    for (const row of setRows.rows) {
        const list = setsBySession.get(row.session_id) ?? []
        list.push({
            ...mapSetLog(row),
            isPr: isPrById.get(row.id) ?? false,
        })
        setsBySession.set(row.session_id, list)
    }
    // Re-sort sets within each session by set_number (display order).
    for (const list of setsBySession.values()) {
        list.sort((a, b) => a.setNumber - b.setNumber)
    }

    const items: ExerciseHistoryEntry[] = sessionRows.rows.map((row) => ({
        sessionId: row.id,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        sets: setsBySession.get(row.id) ?? [],
    }))

    return { items }
}
