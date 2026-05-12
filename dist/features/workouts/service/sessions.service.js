import { pool } from "../../../config/dbConnect.js";
import { HttpError } from "../../../utils/http-error.js";
// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------
// pg returns NUMERIC as strings to preserve precision. Convert to number.
function toNumber(value) {
    if (value == null)
        return null;
    return typeof value === "string" ? Number(value) : value;
}
function mapSession(row) {
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
    };
}
function mapSetLog(row) {
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
    };
}
// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------
// Confirm the session belongs to this user. Used as a 404/403 gate before
// any read or mutation. Treats "not found" and "not yours" the same so we
// don't leak existence.
async function getOwnedSession(userId, sessionId) {
    const result = await pool.query(`SELECT * FROM workout_sessions WHERE id = $1 AND user_id = $2`, [sessionId, userId]);
    if (!result.rows[0])
        throw new HttpError(404, "Session not found");
    return mapSession(result.rows[0]);
}
async function loadSetsForSession(sessionId) {
    const result = await pool.query(`SELECT * FROM set_logs
         WHERE session_id = $1
         ORDER BY plan_exercise_id, set_number ASC`, [sessionId]);
    return result.rows.map(mapSetLog);
}
// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------
/**
 * Start a session against a plan_day. Pulls plan_id from the day so the
 * client doesn't need to send it. Returns 409 if the user already has an
 * in-progress session — we lean on the partial unique index to enforce this
 * and translate the unique_violation into a friendly error.
 */
export async function createSession(userId, planDayId) {
    const dayResult = await pool.query(`SELECT pd.id, pd.plan_id
         FROM plan_days pd
         JOIN workout_plans wp ON wp.id = pd.plan_id
         WHERE pd.id = $1 AND wp.user_id = $2`, [planDayId, userId]);
    if (!dayResult.rows[0])
        throw new HttpError(404, "Plan day not found");
    const planId = dayResult.rows[0].plan_id;
    try {
        const result = await pool.query(`INSERT INTO workout_sessions (user_id, plan_id, plan_day_id)
             VALUES ($1, $2, $3)
             RETURNING *`, [userId, planId, planDayId]);
        return mapSession(result.rows[0]);
    }
    catch (err) {
        // 23505 = unique_violation. Our partial index permits only one
        // workout_session with completed_at IS NULL per user.
        if (err?.code === "23505") {
            throw new HttpError(409, "You already have a workout in progress. Finish or abandon it first.");
        }
        throw err;
    }
}
export async function getActiveSession(userId) {
    const result = await pool.query(`SELECT * FROM workout_sessions
         WHERE user_id = $1 AND completed_at IS NULL
         LIMIT 1`, [userId]);
    if (!result.rows[0])
        return null;
    const session = mapSession(result.rows[0]);
    const sets = await loadSetsForSession(session.id);
    return { ...session, sets };
}
export async function getSession(userId, sessionId) {
    const session = await getOwnedSession(userId, sessionId);
    const sets = await loadSetsForSession(session.id);
    return { ...session, sets };
}
/**
 * Mark a session complete. No-op-with-error if it's already completed —
 * we don't want to silently reset completed_at and confuse history.
 */
export async function completeSession(userId, sessionId, input) {
    const session = await getOwnedSession(userId, sessionId);
    if (session.completedAt) {
        throw new HttpError(409, "Session is already complete");
    }
    const result = await pool.query(`UPDATE workout_sessions
         SET completed_at = now(),
             notes = COALESCE($2, notes)
         WHERE id = $1
         RETURNING *`, [sessionId, input.notes ?? null]);
    return mapSession(result.rows[0]);
}
/**
 * Abandon an in-progress session. We refuse to delete completed sessions —
 * those are history and live forever (until the user is deleted).
 */
export async function abandonSession(userId, sessionId) {
    const session = await getOwnedSession(userId, sessionId);
    if (session.completedAt) {
        throw new HttpError(409, "Can't abandon a completed session");
    }
    await pool.query(`DELETE FROM workout_sessions WHERE id = $1`, [sessionId]);
}
// ---------------------------------------------------------------------------
// Set logs
// ---------------------------------------------------------------------------
/**
 * UPSERT a set log against (session, plan_exercise, set_number). Refuses to
 * write to a completed session. Verifies the plan_exercise belongs to the
 * session's plan_day so a user can't log under another plan's exercise.
 */
export async function upsertSetLog(userId, sessionId, input) {
    const session = await getOwnedSession(userId, sessionId);
    if (session.completedAt) {
        throw new HttpError(409, "Can't log sets on a completed session");
    }
    const fitResult = await pool.query(`SELECT 1 FROM plan_exercises
         WHERE id = $1 AND plan_day_id = $2`, [input.planExerciseId, session.planDayId]);
    if (!fitResult.rows[0]) {
        throw new HttpError(400, "That exercise isn't part of this session's day");
    }
    const result = await pool.query(`INSERT INTO set_logs (
            session_id, plan_exercise_id, set_number,
            weight_kg, reps, rpe, notes
         ) VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (session_id, plan_exercise_id, set_number) DO UPDATE SET
            weight_kg = EXCLUDED.weight_kg,
            reps      = EXCLUDED.reps,
            rpe       = EXCLUDED.rpe,
            notes     = EXCLUDED.notes,
            logged_at = now()
         RETURNING *`, [
        sessionId,
        input.planExerciseId,
        input.setNumber,
        input.weightKg ?? null,
        input.reps,
        input.rpe ?? null,
        input.notes ?? null,
    ]);
    return mapSetLog(result.rows[0]);
}
export async function deleteSetLog(userId, sessionId, setLogId) {
    const session = await getOwnedSession(userId, sessionId);
    if (session.completedAt) {
        throw new HttpError(409, "Can't edit sets on a completed session");
    }
    const result = await pool.query(`DELETE FROM set_logs WHERE id = $1 AND session_id = $2`, [setLogId, sessionId]);
    if (result.rowCount === 0) {
        throw new HttpError(404, "Set log not found");
    }
}
//# sourceMappingURL=sessions.service.js.map