import { pool } from "../../../config/dbConnect.js";
import { HttpError } from "../../../utils/http-error.js";
function mapRow(row) {
    return {
        id: row.id,
        userId: row.user_id,
        name: row.name,
        slug: row.slug,
        primaryMuscles: row.primary_muscles ?? [],
        secondaryMuscles: row.secondary_muscles ?? [],
        equipment: row.equipment,
        mechanic: row.mechanic,
        level: row.level,
        instructions: row.instructions ?? [],
        demoUrl: row.demo_url,
        archivedAt: row.archived_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}
/** Lowercase, hyphenate, strip non-alnum. Stable, idempotent. */
function slugify(name) {
    return (name
        .toLowerCase()
        .trim()
        .replace(/[^\p{L}\p{N}]+/gu, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60) || "exercise");
}
/** Find a slug that's unique within (user_id). Append -2, -3 on collision. */
async function pickUniqueSlug(userId, base, excludeId) {
    let candidate = base;
    let n = 2;
    // Cheap loop — slug collisions for the same user are rare, this maxes
    // out at a handful of queries.
    for (;;) {
        const params = [userId, candidate];
        let where = `user_id = $1 AND slug = $2`;
        if (excludeId) {
            params.push(excludeId);
            where += ` AND id != $${params.length}`;
        }
        const r = await pool.query(`SELECT 1 FROM user_exercises WHERE ${where} LIMIT 1`, params);
        if (r.rows.length === 0)
            return candidate;
        candidate = `${base}-${n++}`;
    }
}
// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------
export async function listUserExercises(userId, opts = {}) {
    const where = opts.includeArchived
        ? `WHERE user_id = $1`
        : `WHERE user_id = $1 AND archived_at IS NULL`;
    const r = await pool.query(`SELECT * FROM user_exercises ${where} ORDER BY name ASC`, [userId]);
    return r.rows.map(mapRow);
}
/** Look up by id, scoped to the user. Returns null if not found / not owned. */
export async function findUserExerciseById(userId, id) {
    const r = await pool.query(`SELECT * FROM user_exercises WHERE id = $1 AND user_id = $2`, [id, userId]);
    return r.rows[0] ? mapRow(r.rows[0]) : null;
}
// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------
export async function createUserExercise(userId, input) {
    const slug = await pickUniqueSlug(userId, slugify(input.name));
    const r = await pool.query(`INSERT INTO user_exercises (
            user_id, name, slug,
            primary_muscles, secondary_muscles,
            equipment, mechanic, level,
            instructions, demo_url
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`, [
        userId,
        input.name.trim(),
        slug,
        input.primaryMuscles,
        input.secondaryMuscles ?? [],
        input.equipment ?? null,
        input.mechanic ?? null,
        input.level,
        input.instructions ?? [],
        input.demoUrl ?? null,
    ]);
    return mapRow(r.rows[0]);
}
export async function updateUserExercise(userId, id, input) {
    const existing = await findUserExerciseById(userId, id);
    if (!existing)
        throw new HttpError(404, "Exercise not found");
    const sets = [];
    const values = [];
    let i = 1;
    const setIf = (col, value) => {
        sets.push(`${col} = $${i++}`);
        values.push(value);
    };
    if (input.name !== undefined) {
        const trimmed = input.name.trim();
        setIf("name", trimmed);
        // Re-slug only on rename.
        if (trimmed !== existing.name) {
            const slug = await pickUniqueSlug(userId, slugify(trimmed), id);
            setIf("slug", slug);
        }
    }
    if (input.primaryMuscles !== undefined)
        setIf("primary_muscles", input.primaryMuscles);
    if (input.secondaryMuscles !== undefined)
        setIf("secondary_muscles", input.secondaryMuscles);
    if (input.equipment !== undefined)
        setIf("equipment", input.equipment);
    if (input.mechanic !== undefined)
        setIf("mechanic", input.mechanic);
    if (input.level !== undefined)
        setIf("level", input.level);
    if (input.instructions !== undefined)
        setIf("instructions", input.instructions);
    if (input.demoUrl !== undefined)
        setIf("demo_url", input.demoUrl);
    if (sets.length === 0)
        return existing;
    values.push(id);
    const r = await pool.query(`UPDATE user_exercises SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`, values);
    return mapRow(r.rows[0]);
}
export async function archiveUserExercise(userId, id) {
    const existing = await findUserExerciseById(userId, id);
    if (!existing)
        throw new HttpError(404, "Exercise not found");
    if (existing.archivedAt)
        return existing;
    const r = await pool.query(`UPDATE user_exercises SET archived_at = now() WHERE id = $1 RETURNING *`, [id]);
    return mapRow(r.rows[0]);
}
export async function restoreUserExercise(userId, id) {
    const existing = await findUserExerciseById(userId, id);
    if (!existing)
        throw new HttpError(404, "Exercise not found");
    if (!existing.archivedAt)
        return existing;
    const r = await pool.query(`UPDATE user_exercises SET archived_at = NULL WHERE id = $1 RETURNING *`, [id]);
    return mapRow(r.rows[0]);
}
//# sourceMappingURL=user-exercises.service.js.map