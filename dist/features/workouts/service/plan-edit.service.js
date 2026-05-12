import { pool } from "../../../config/dbConnect.js";
import { HttpError } from "../../../utils/http-error.js";
import { getOrCreateProfile } from "../../profile/service/profile.service.js";
import { getActivePlan } from "./workout.service.js";
/**
 * Block plan edits while a session is in progress. Returns the active
 * sessionId on the error so the client can deep-link.
 */
async function assertNoActiveSession(client, userId) {
    const r = await client.query(`SELECT id FROM workout_sessions
         WHERE user_id = $1 AND completed_at IS NULL
         LIMIT 1`, [userId]);
    if (r.rows[0]) {
        throw new HttpError(409, "session_in_progress", {
            sessionId: r.rows[0].id,
        });
    }
}
/** Fetch the user's active plan id + split type, or 404. */
async function getActivePlanRow(client, userId) {
    const r = await client.query(`SELECT id, split_type FROM workout_plans
         WHERE user_id = $1 AND status = 'active'
         LIMIT 1`, [userId]);
    if (!r.rows[0])
        throw new HttpError(404, "No active plan");
    return { id: r.rows[0].id, splitType: r.rows[0].split_type };
}
/** Auto-promote to `'custom'` on the first non-swap edit. */
async function flipToCustomIfNeeded(client, planId, currentSplit) {
    if (currentSplit === "custom")
        return;
    await client.query(`UPDATE workout_plans SET split_type = 'custom' WHERE id = $1`, [planId]);
}
/**
 * Translate Postgres FK violations on plan_exercises → set_logs into a
 * 409 the client can render as "this has logged sets, archive instead".
 */
function translateFk(err) {
    if (err &&
        typeof err === "object" &&
        "code" in err &&
        err.code === "23503") {
        throw new HttpError(409, "exercise_has_logs");
    }
    throw err;
}
/**
 * Confirm a day belongs to the user's active plan. Returns the day row.
 */
async function getOwnedDay(client, userId, dayId) {
    const r = await client.query(`SELECT pd.plan_id
         FROM plan_days pd
         JOIN workout_plans wp ON wp.id = pd.plan_id
         WHERE pd.id = $1 AND wp.user_id = $2 AND wp.status = 'active'`, [dayId, userId]);
    if (!r.rows[0])
        throw new HttpError(404, "Day not found");
    return { planId: r.rows[0].plan_id };
}
/**
 * Confirm a plan_exercise belongs to the user's active plan. Returns the
 * row + plan id.
 */
async function getOwnedPlanExercise(client, userId, planExerciseId) {
    const r = await client.query(`SELECT pd.plan_id, pe.plan_day_id
         FROM plan_exercises pe
         JOIN plan_days pd ON pd.id = pe.plan_day_id
         JOIN workout_plans wp ON wp.id = pd.plan_id
         WHERE pe.id = $1 AND wp.user_id = $2 AND wp.status = 'active'`, [planExerciseId, userId]);
    if (!r.rows[0])
        throw new HttpError(404, "Plan exercise not found");
    return { planId: r.rows[0].plan_id, planDayId: r.rows[0].plan_day_id };
}
/** Wrap a transactional block and surface translated errors. */
async function tx(fn) {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const result = await fn(client);
        await client.query("COMMIT");
        return result;
    }
    catch (err) {
        await client.query("ROLLBACK");
        throw err;
    }
    finally {
        client.release();
    }
}
/** Reload the hydrated active plan, throwing if it disappeared. */
async function loadActivePlanOrThrow(userId) {
    const plan = await getActivePlan(userId);
    if (!plan)
        throw new HttpError(500, "Plan disappeared during write");
    return plan;
}
// ---------------------------------------------------------------------------
// Plan-level
// ---------------------------------------------------------------------------
export async function updatePlan(userId, input) {
    await tx(async (c) => {
        await assertNoActiveSession(c, userId);
        const plan = await getActivePlanRow(c, userId);
        const sets = [];
        const values = [];
        let i = 1;
        if (input.name !== undefined) {
            sets.push(`name = $${i++}`);
            values.push(input.name);
        }
        if (input.notes !== undefined) {
            sets.push(`notes = $${i++}`);
            values.push(input.notes);
        }
        if (input.goal !== undefined) {
            sets.push(`goal = $${i++}`);
            values.push(input.goal);
        }
        if (sets.length === 0)
            return; // no-op
        values.push(plan.id);
        await c.query(`UPDATE workout_plans SET ${sets.join(", ")} WHERE id = $${i}`, values);
        await flipToCustomIfNeeded(c, plan.id, plan.splitType);
    });
    return loadActivePlanOrThrow(userId);
}
/**
 * Archive existing active plan, create a new empty one. Days_per_week
 * snapshot from current profile. The user fills in days/exercises after.
 */
export async function createEmptyPlan(userId, input) {
    const profile = await getOrCreateProfile(userId);
    if (!profile.goal || !profile.trainingDaysPerWeek) {
        throw new HttpError(400, "Complete onboarding before creating a plan");
    }
    await tx(async (c) => {
        await assertNoActiveSession(c, userId);
        await c.query(`UPDATE workout_plans SET status = 'archived'
             WHERE user_id = $1 AND status = 'active'`, [userId]);
        await c.query(`INSERT INTO workout_plans
                 (user_id, name, split_type, days_per_week, goal, status)
             VALUES ($1, $2, 'custom', $3, $4, 'active')`, [
            userId,
            input.name ?? null,
            profile.trainingDaysPerWeek,
            profile.goal,
        ]);
    });
    return loadActivePlanOrThrow(userId);
}
/** Archive the active plan; user lands in "no plan" state. */
export async function deletePlan(userId) {
    await tx(async (c) => {
        await assertNoActiveSession(c, userId);
        const r = await c.query(`UPDATE workout_plans SET status = 'archived'
             WHERE user_id = $1 AND status = 'active'`, [userId]);
        if (r.rowCount === 0) {
            throw new HttpError(404, "No active plan");
        }
    });
}
// ---------------------------------------------------------------------------
// Days
// ---------------------------------------------------------------------------
export async function createDay(userId, input) {
    await tx(async (c) => {
        await assertNoActiveSession(c, userId);
        const plan = await getActivePlanRow(c, userId);
        await c.query(`INSERT INTO plan_days (plan_id, day_index, name, weekday_hint)
             VALUES (
                $1,
                (SELECT COALESCE(MAX(day_index), -1) + 1 FROM plan_days WHERE plan_id = $1),
                $2,
                $3
             )`, [plan.id, input.name, input.weekdayHint ?? null]);
        await flipToCustomIfNeeded(c, plan.id, plan.splitType);
    });
    return loadActivePlanOrThrow(userId);
}
export async function updateDay(userId, dayId, input) {
    await tx(async (c) => {
        await assertNoActiveSession(c, userId);
        const plan = await getActivePlanRow(c, userId);
        await getOwnedDay(c, userId, dayId);
        const sets = [];
        const values = [];
        let i = 1;
        if (input.name !== undefined) {
            sets.push(`name = $${i++}`);
            values.push(input.name);
        }
        if (input.weekdayHint !== undefined) {
            sets.push(`weekday_hint = $${i++}`);
            values.push(input.weekdayHint);
        }
        if (sets.length === 0)
            return;
        values.push(dayId);
        await c.query(`UPDATE plan_days SET ${sets.join(", ")} WHERE id = $${i}`, values);
        await flipToCustomIfNeeded(c, plan.id, plan.splitType);
    });
    return loadActivePlanOrThrow(userId);
}
export async function deleteDay(userId, dayId) {
    await tx(async (c) => {
        await assertNoActiveSession(c, userId);
        const plan = await getActivePlanRow(c, userId);
        await getOwnedDay(c, userId, dayId);
        // Refuse if it would leave the plan with zero days.
        const count = await c.query(`SELECT COUNT(*)::int AS n FROM plan_days WHERE plan_id = $1`, [plan.id]);
        if ((count.rows[0]?.n ?? 0) <= 1) {
            throw new HttpError(409, "A plan needs at least one day");
        }
        try {
            await c.query(`DELETE FROM plan_days WHERE id = $1`, [dayId]);
        }
        catch (err) {
            translateFk(err); // throws
        }
        await flipToCustomIfNeeded(c, plan.id, plan.splitType);
    });
    return loadActivePlanOrThrow(userId);
}
export async function reorderDays(userId, input) {
    await tx(async (c) => {
        await assertNoActiveSession(c, userId);
        const plan = await getActivePlanRow(c, userId);
        // Validate the body is exactly the plan's days, with indices that
        // form a 0..N-1 permutation.
        const existing = await c.query(`SELECT id FROM plan_days WHERE plan_id = $1`, [plan.id]);
        const existingIds = new Set(existing.rows.map((r) => r.id));
        if (existingIds.size !== input.length) {
            throw new HttpError(400, "Reorder must include every day");
        }
        const seenIds = new Set();
        const indices = [];
        for (const item of input) {
            if (!existingIds.has(item.dayId)) {
                throw new HttpError(400, `Unknown day ${item.dayId}`);
            }
            if (seenIds.has(item.dayId)) {
                throw new HttpError(400, "Duplicate day in reorder");
            }
            seenIds.add(item.dayId);
            indices.push(item.dayIndex);
        }
        indices.sort((a, b) => a - b);
        for (let i = 0; i < indices.length; i++) {
            if (indices[i] !== i) {
                throw new HttpError(400, "dayIndex must be 0..N-1 with no gaps");
            }
        }
        // Shift to dodge the (plan_id, day_index) UNIQUE constraint, then
        // apply the new positions.
        await c.query(`UPDATE plan_days SET day_index = day_index + 1000 WHERE plan_id = $1`, [plan.id]);
        for (const item of input) {
            await c.query(`UPDATE plan_days SET day_index = $1 WHERE id = $2`, [item.dayIndex, item.dayId]);
        }
        await flipToCustomIfNeeded(c, plan.id, plan.splitType);
    });
    return loadActivePlanOrThrow(userId);
}
// ---------------------------------------------------------------------------
// Exercises
// ---------------------------------------------------------------------------
export async function createExercise(userId, dayId, input) {
    await tx(async (c) => {
        await assertNoActiveSession(c, userId);
        const plan = await getActivePlanRow(c, userId);
        await getOwnedDay(c, userId, dayId);
        // Confirm the exercise exists in whichever catalog the input picks.
        // FK would otherwise leak as a 500; ownership is required for
        // user_exercises so a user can't reference someone else's lift.
        if (input.exerciseId) {
            const r = await c.query(`SELECT 1 FROM exercises WHERE id = $1`, [
                input.exerciseId,
            ]);
            if (!r.rows[0])
                throw new HttpError(404, "Exercise not found");
        }
        else if (input.userExerciseId) {
            const r = await c.query(`SELECT 1 FROM user_exercises
                 WHERE id = $1 AND user_id = $2 AND archived_at IS NULL`, [input.userExerciseId, userId]);
            if (!r.rows[0])
                throw new HttpError(404, "Custom exercise not found");
        }
        else {
            throw new HttpError(400, "Provide exerciseId or userExerciseId");
        }
        await c.query(`INSERT INTO plan_exercises (
                plan_day_id, exercise_id, user_exercise_id, position,
                target_sets, target_reps_min, target_reps_max,
                target_rpe, rest_seconds, notes
             ) VALUES (
                $1, $2, $3,
                (SELECT COALESCE(MAX(position), -1) + 1 FROM plan_exercises WHERE plan_day_id = $1),
                $4, $5, $6, $7, $8, $9
             )`, [
            dayId,
            input.exerciseId ?? null,
            input.userExerciseId ?? null,
            input.targetSets,
            input.targetRepsMin,
            input.targetRepsMax,
            input.targetRpe ?? null,
            input.restSeconds ?? null,
            input.notes ?? null,
        ]);
        await flipToCustomIfNeeded(c, plan.id, plan.splitType);
    });
    return loadActivePlanOrThrow(userId);
}
/**
 * Partial update — used for both swap (`{ exerciseId }`) and edits
 * (`{ targetSets, ... }`). Auto-flip is skipped for pure swaps to keep
 * parity with the previous `swap` behavior; any non-exerciseId field
 * triggers the flip.
 */
export async function updateExercise(userId, planExerciseId, input) {
    await tx(async (c) => {
        await assertNoActiveSession(c, userId);
        const plan = await getActivePlanRow(c, userId);
        await getOwnedPlanExercise(c, userId, planExerciseId);
        const sets = [];
        const values = [];
        let i = 1;
        const setIf = (col, value) => {
            sets.push(`${col} = $${i++}`);
            values.push(value);
        };
        // Swap path: set exactly one of (exercise_id, user_exercise_id) and
        // null out the other so the XOR CHECK stays satisfied.
        if (input.exerciseId !== undefined) {
            const ex = await c.query(`SELECT 1 FROM exercises WHERE id = $1`, [
                input.exerciseId,
            ]);
            if (!ex.rows[0])
                throw new HttpError(404, "Exercise not found");
            setIf("exercise_id", input.exerciseId);
            setIf("user_exercise_id", null);
        }
        if (input.userExerciseId !== undefined) {
            const ex = await c.query(`SELECT 1 FROM user_exercises
                 WHERE id = $1 AND user_id = $2 AND archived_at IS NULL`, [input.userExerciseId, userId]);
            if (!ex.rows[0])
                throw new HttpError(404, "Custom exercise not found");
            setIf("user_exercise_id", input.userExerciseId);
            setIf("exercise_id", null);
        }
        if (input.targetSets !== undefined)
            setIf("target_sets", input.targetSets);
        if (input.targetRepsMin !== undefined)
            setIf("target_reps_min", input.targetRepsMin);
        if (input.targetRepsMax !== undefined)
            setIf("target_reps_max", input.targetRepsMax);
        if (input.targetRpe !== undefined)
            setIf("target_rpe", input.targetRpe);
        if (input.restSeconds !== undefined)
            setIf("rest_seconds", input.restSeconds);
        if (input.notes !== undefined)
            setIf("notes", input.notes);
        if (sets.length === 0)
            return;
        values.push(planExerciseId);
        try {
            await c.query(`UPDATE plan_exercises SET ${sets.join(", ")} WHERE id = $${i}`, values);
        }
        catch (err) {
            if (err?.code === "23514") {
                throw new HttpError(400, "Invalid sets/reps combination");
            }
            throw err;
        }
        // Editing fields beyond a pure swap promotes to custom.
        const editedNonSwap = Object.keys(input).some((k) => k !== "exerciseId" &&
            k !== "userExerciseId" &&
            input[k] !== undefined);
        if (editedNonSwap) {
            await flipToCustomIfNeeded(c, plan.id, plan.splitType);
        }
    });
    return loadActivePlanOrThrow(userId);
}
export async function deleteExercise(userId, planExerciseId) {
    await tx(async (c) => {
        await assertNoActiveSession(c, userId);
        const plan = await getActivePlanRow(c, userId);
        await getOwnedPlanExercise(c, userId, planExerciseId);
        try {
            await c.query(`DELETE FROM plan_exercises WHERE id = $1`, [
                planExerciseId,
            ]);
        }
        catch (err) {
            translateFk(err); // throws
        }
        await flipToCustomIfNeeded(c, plan.id, plan.splitType);
    });
    return loadActivePlanOrThrow(userId);
}
export async function reorderExercises(userId, dayId, input) {
    await tx(async (c) => {
        await assertNoActiveSession(c, userId);
        const plan = await getActivePlanRow(c, userId);
        await getOwnedDay(c, userId, dayId);
        const existing = await c.query(`SELECT id FROM plan_exercises WHERE plan_day_id = $1`, [dayId]);
        const existingIds = new Set(existing.rows.map((r) => r.id));
        if (existingIds.size !== input.length) {
            throw new HttpError(400, "Reorder must include every exercise");
        }
        const seen = new Set();
        const positions = [];
        for (const item of input) {
            if (!existingIds.has(item.planExerciseId)) {
                throw new HttpError(400, `Unknown exercise ${item.planExerciseId}`);
            }
            if (seen.has(item.planExerciseId)) {
                throw new HttpError(400, "Duplicate exercise in reorder");
            }
            seen.add(item.planExerciseId);
            positions.push(item.position);
        }
        positions.sort((a, b) => a - b);
        for (let i = 0; i < positions.length; i++) {
            if (positions[i] !== i) {
                throw new HttpError(400, "position must be 0..N-1 with no gaps");
            }
        }
        await c.query(`UPDATE plan_exercises SET position = position + 1000 WHERE plan_day_id = $1`, [dayId]);
        for (const item of input) {
            await c.query(`UPDATE plan_exercises SET position = $1 WHERE id = $2`, [item.position, item.planExerciseId]);
        }
        await flipToCustomIfNeeded(c, plan.id, plan.splitType);
    });
    return loadActivePlanOrThrow(userId);
}
//# sourceMappingURL=plan-edit.service.js.map