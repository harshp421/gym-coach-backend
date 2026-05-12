import { pool } from "../../../config/dbConnect.js";
function mapSystemExercise(row) {
    return {
        id: row.id,
        externalId: row.external_id,
        slug: row.slug,
        name: row.name,
        force: row.force,
        level: row.level,
        mechanic: row.mechanic,
        equipment: row.equipment,
        category: row.category,
        primaryMuscles: row.primary_muscles ?? [],
        secondaryMuscles: row.secondary_muscles ?? [],
        instructions: row.instructions ?? [],
        imageUrls: row.image_urls ?? [],
        origin: "system",
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}
/**
 * user_exercises mapped into the same `Exercise` shape so callers don't
 * have to discriminate. category is hardcoded "strength" — that's the
 * only thing the rule-based generator looks at, and v1 user exercises are
 * always treated as strength work.
 */
function mapUserExercise(row) {
    return {
        id: row.id,
        externalId: null,
        slug: row.slug,
        name: row.name,
        force: null,
        level: row.level,
        mechanic: row.mechanic,
        equipment: row.equipment,
        category: "strength",
        primaryMuscles: row.primary_muscles ?? [],
        secondaryMuscles: row.secondary_muscles ?? [],
        instructions: row.instructions ?? [],
        imageUrls: [],
        origin: "user",
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}
export async function listExercises(q) {
    const source = q.source && ["all", "system", "user"].includes(q.source) ? q.source : "all";
    const wantSystem = source === "all" || source === "system";
    const wantUser = (source === "all" || source === "user") && !!q.userId;
    const items = [];
    let total = 0;
    if (wantSystem) {
        const systemResult = await querySystem(q);
        items.push(...systemResult.items);
        total += systemResult.total;
    }
    if (wantUser && q.userId) {
        const userResult = await queryUser(q.userId, q);
        items.push(...userResult.items);
        total += userResult.total;
    }
    // Merge by name, dedupe by id (id space is disjoint between tables anyway).
    items.sort((a, b) => a.name.localeCompare(b.name));
    // Honor limit/offset across the merged set.
    const limit = Math.min(Math.max(q.limit ?? 30, 1), 100);
    const offset = Math.max(q.offset ?? 0, 0);
    return { items: items.slice(offset, offset + limit), total };
}
async function querySystem(q) {
    const where = [];
    const params = [];
    if (q.muscle) {
        params.push([q.muscle]);
        where.push(`primary_muscles && $${params.length}::text[]`);
    }
    if (q.equipment) {
        params.push(q.equipment);
        where.push(`equipment = $${params.length}`);
    }
    if (q.level) {
        params.push(q.level);
        where.push(`level = $${params.length}`);
    }
    if (q.mechanic) {
        params.push(q.mechanic);
        where.push(`mechanic = $${params.length}`);
    }
    if (q.category) {
        params.push(q.category);
        where.push(`category = $${params.length}`);
    }
    if (q.q) {
        params.push(`%${q.q}%`);
        where.push(`name ILIKE $${params.length}`);
    }
    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const countResult = await pool.query(`SELECT COUNT(*)::int AS n FROM exercises ${whereClause}`, params);
    const total = countResult.rows[0].n;
    const r = await pool.query(`SELECT * FROM exercises ${whereClause} ORDER BY name ASC`, params);
    return { items: r.rows.map(mapSystemExercise), total };
}
async function queryUser(userId, q) {
    const where = ["user_id = $1", "archived_at IS NULL"];
    const params = [userId];
    if (q.muscle) {
        params.push([q.muscle]);
        where.push(`primary_muscles && $${params.length}::text[]`);
    }
    if (q.equipment) {
        params.push(q.equipment);
        where.push(`equipment = $${params.length}`);
    }
    if (q.level) {
        params.push(q.level);
        where.push(`level = $${params.length}`);
    }
    if (q.mechanic) {
        params.push(q.mechanic);
        where.push(`mechanic = $${params.length}`);
    }
    if (q.q) {
        params.push(`%${q.q}%`);
        where.push(`name ILIKE $${params.length}`);
    }
    const whereClause = `WHERE ${where.join(" AND ")}`;
    const countResult = await pool.query(`SELECT COUNT(*)::int AS n FROM user_exercises ${whereClause}`, params);
    const total = countResult.rows[0].n;
    const r = await pool.query(`SELECT * FROM user_exercises ${whereClause} ORDER BY name ASC`, params);
    return { items: r.rows.map(mapUserExercise), total };
}
export async function findExerciseBySlug(slug) {
    const result = await pool.query(`SELECT * FROM exercises WHERE slug = $1`, [
        slug,
    ]);
    return result.rows[0] ? mapSystemExercise(result.rows[0]) : null;
}
export async function findExerciseById(id) {
    const result = await pool.query(`SELECT * FROM exercises WHERE id = $1`, [id]);
    return result.rows[0] ? mapSystemExercise(result.rows[0]) : null;
}
/**
 * Look up an exercise by id from either table, scoped to the user for the
 * user_exercises side. Used by plan-edit to hydrate `Exercise` regardless
 * of which catalog the plan_exercise points at.
 */
export async function findExerciseAnywhere(userId, args) {
    if (args.exerciseId) {
        const r = await pool.query(`SELECT * FROM exercises WHERE id = $1`, [
            args.exerciseId,
        ]);
        return r.rows[0] ? mapSystemExercise(r.rows[0]) : null;
    }
    if (args.userExerciseId) {
        const r = await pool.query(`SELECT * FROM user_exercises WHERE id = $1 AND user_id = $2`, [args.userExerciseId, userId]);
        return r.rows[0] ? mapUserExercise(r.rows[0]) : null;
    }
    return null;
}
// Workout generator stays system-only by design (predictable plans).
export async function listForGenerator(input) {
    const result = await pool.query(`SELECT * FROM exercises
         WHERE category = 'strength'
           AND level = ANY($1::text[])
           AND (equipment IS NULL OR equipment = ANY($2::text[]))
         ORDER BY name ASC`, [input.allowedLevels, input.allowedEquipment]);
    return result.rows.map(mapSystemExercise);
}
//# sourceMappingURL=exercises.service.js.map