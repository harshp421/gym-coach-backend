import { pool } from "../../../config/dbConnect.js"
import { cached } from "../../../lib/cache.js"
import type {
    Exercise,
    ExerciseListQuery,
    ExerciseListResult,
    GalleryQuery,
    GalleryResult,
} from "../exercises.types.js"

// System exercises are seed data — they don't change at runtime. An hour
// TTL means a fresh deploy with new seed data reflects within an hour
// (without manual cache flush), and existing rows are served from cache.
const SYSTEM_TTL_SEC = 3600

function mapSystemExercise(row: any): Exercise {
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
    }
}

// Slim row mapper for list responses. Skips the heavy fields (instructions,
// image URLs, secondary muscles) that the picker UI never reads — typical
// list payload shrinks ~5–10x. Detail endpoint still returns the full shape.
function mapSystemExerciseLite(row: any): Exercise {
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
        secondaryMuscles: [],
        instructions: [],
        imageUrls: [],
        origin: "system",
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    }
}

/**
 * user_exercises mapped into the same `Exercise` shape so callers don't
 * have to discriminate. category is hardcoded "strength" — that's the
 * only thing the rule-based generator looks at, and v1 user exercises are
 * always treated as strength work.
 */
function mapUserExercise(row: any): Exercise {
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
    }
}

function mapUserExerciseLite(row: any): Exercise {
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
        secondaryMuscles: [],
        instructions: [],
        imageUrls: [],
        origin: "user",
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    }
}

type Source = "all" | "system" | "user"

export async function listExercises(
    q: ExerciseListQuery & { userId?: string; source?: Source },
): Promise<ExerciseListResult> {
    const source: Source =
        q.source && ["all", "system", "user"].includes(q.source) ? q.source : "all"

    const wantSystem = source === "all" || source === "system"
    const wantUser = (source === "all" || source === "user") && !!q.userId

    const items: Exercise[] = []
    let total = 0

    if (wantSystem) {
        const systemResult = await querySystem(q)
        items.push(...systemResult.items)
        total += systemResult.total
    }

    if (wantUser && q.userId) {
        const userResult = await queryUser(q.userId, q)
        items.push(...userResult.items)
        total += userResult.total
    }

    // Merge by name, dedupe by id (id space is disjoint between tables anyway).
    items.sort((a, b) => a.name.localeCompare(b.name))

    // Honor limit/offset across the merged set.
    const limit = Math.min(Math.max(q.limit ?? 30, 1), 100)
    const offset = Math.max(q.offset ?? 0, 0)
    return { items: items.slice(offset, offset + limit), total }
}

async function querySystem(q: ExerciseListQuery): Promise<ExerciseListResult> {
    // Cache by the exact filter combo. System exercises are read-only so
    // the same query string always yields the same rows.
    const key = `ex:sys:${JSON.stringify({
        muscle: q.muscle ?? null,
        equipment: q.equipment ?? null,
        level: q.level ?? null,
        mechanic: q.mechanic ?? null,
        category: q.category ?? null,
        q: q.q ?? null,
    })}`
    return cached(key, SYSTEM_TTL_SEC, () => querySystemFromDb(q))
}

async function querySystemFromDb(
    q: ExerciseListQuery,
): Promise<ExerciseListResult> {
    const where: string[] = []
    const params: any[] = []

    if (q.muscle) {
        params.push([q.muscle])
        where.push(`primary_muscles && $${params.length}::text[]`)
    }
    if (q.equipment) {
        params.push(q.equipment)
        where.push(`equipment = $${params.length}`)
    }
    if (q.level) {
        params.push(q.level)
        where.push(`level = $${params.length}`)
    }
    if (q.mechanic) {
        params.push(q.mechanic)
        where.push(`mechanic = $${params.length}`)
    }
    if (q.category) {
        params.push(q.category)
        where.push(`category = $${params.length}`)
    }
    if (q.q) {
        params.push(`%${q.q}%`)
        where.push(`name ILIKE $${params.length}`)
    }

    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : ""

    const countResult = await pool.query(
        `SELECT COUNT(*)::int AS n FROM exercises ${whereClause}`,
        params,
    )
    const total: number = countResult.rows[0].n

    const r = await pool.query(
        `SELECT id, external_id, slug, name, force, level, mechanic, equipment,
                category, primary_muscles, created_at, updated_at
           FROM exercises ${whereClause} ORDER BY name ASC`,
        params,
    )

    return { items: r.rows.map(mapSystemExerciseLite), total }
}

async function queryUser(
    userId: string,
    q: ExerciseListQuery,
): Promise<ExerciseListResult> {
    const where: string[] = ["user_id = $1", "archived_at IS NULL"]
    const params: any[] = [userId]

    if (q.muscle) {
        params.push([q.muscle])
        where.push(`primary_muscles && $${params.length}::text[]`)
    }
    if (q.equipment) {
        params.push(q.equipment)
        where.push(`equipment = $${params.length}`)
    }
    if (q.level) {
        params.push(q.level)
        where.push(`level = $${params.length}`)
    }
    if (q.mechanic) {
        params.push(q.mechanic)
        where.push(`mechanic = $${params.length}`)
    }
    if (q.q) {
        params.push(`%${q.q}%`)
        where.push(`name ILIKE $${params.length}`)
    }

    const whereClause = `WHERE ${where.join(" AND ")}`

    const countResult = await pool.query(
        `SELECT COUNT(*)::int AS n FROM user_exercises ${whereClause}`,
        params,
    )
    const total: number = countResult.rows[0].n

    const r = await pool.query(
        `SELECT id, slug, name, level, mechanic, equipment, primary_muscles,
                created_at, updated_at
           FROM user_exercises ${whereClause} ORDER BY name ASC`,
        params,
    )

    return { items: r.rows.map(mapUserExerciseLite), total }
}

export async function findExerciseBySlug(slug: string): Promise<Exercise | null> {
    return cached(`ex:sys:slug:${slug}`, SYSTEM_TTL_SEC, async () => {
        const result = await pool.query(
            `SELECT * FROM exercises WHERE slug = $1`,
            [slug],
        )
        return result.rows[0] ? mapSystemExercise(result.rows[0]) : null
    })
}

export async function findExerciseById(id: string): Promise<Exercise | null> {
    const result = await pool.query(`SELECT * FROM exercises WHERE id = $1`, [id])
    return result.rows[0] ? mapSystemExercise(result.rows[0]) : null
}

/**
 * Look up an exercise by id from either table, scoped to the user for the
 * user_exercises side. Used by plan-edit to hydrate `Exercise` regardless
 * of which catalog the plan_exercise points at.
 */
export async function findExerciseAnywhere(
    userId: string,
    args: { exerciseId?: string | null; userExerciseId?: string | null },
): Promise<Exercise | null> {
    if (args.exerciseId) {
        const r = await pool.query(`SELECT * FROM exercises WHERE id = $1`, [
            args.exerciseId,
        ])
        return r.rows[0] ? mapSystemExercise(r.rows[0]) : null
    }
    if (args.userExerciseId) {
        const r = await pool.query(
            `SELECT * FROM user_exercises WHERE id = $1 AND user_id = $2`,
            [args.userExerciseId, userId],
        )
        return r.rows[0] ? mapUserExercise(r.rows[0]) : null
    }
    return null
}

// ---------------------------------------------------------------------------
// Discover-gallery feed
//   - Full image_urls (the picker uses the slim mapper; gallery is image-first)
//   - Per-user `likedByMe` via LEFT JOIN on exercise_likes
//   - Stable random-feeling order by `e.id` (UUIDs are random-ordered)
//   - Not cached at service layer because the joined like state is per-user.
// ---------------------------------------------------------------------------
export async function galleryFeed(
    userId: string,
    q: GalleryQuery,
): Promise<GalleryResult> {
    const where: string[] = ["e.category = 'strength'"]
    const params: any[] = [userId]

    if (q.muscle) {
        params.push([q.muscle])
        where.push(`e.primary_muscles && $${params.length}::text[]`)
    }
    if (q.equipment) {
        params.push(q.equipment)
        where.push(`e.equipment = $${params.length}`)
    }
    if (q.level) {
        params.push(q.level)
        where.push(`e.level = $${params.length}`)
    }
    if (q.mechanic) {
        params.push(q.mechanic)
        where.push(`e.mechanic = $${params.length}`)
    }
    if (q.q) {
        params.push(`%${q.q}%`)
        where.push(`e.name ILIKE $${params.length}`)
    }

    const whereClause = `WHERE ${where.join(" AND ")}`

    // Same JOIN on COUNT so $1 (userId) is referenced — keeps the params
    // array shared between both queries. The LEFT JOIN doesn't multiply
    // rows because exercise_likes has UNIQUE (user_id, exercise_id).
    const countResult = await pool.query(
        `SELECT COUNT(*)::int AS n
         FROM exercises e
         LEFT JOIN exercise_likes l
           ON l.exercise_id = e.id AND l.user_id = $1
         ${whereClause}`,
        params,
    )
    const total: number = countResult.rows[0].n

    const limit = Math.min(Math.max(q.limit ?? 20, 1), 50)
    const offset = Math.max(q.offset ?? 0, 0)
    params.push(limit, offset)

    const r = await pool.query(
        `SELECT e.*, (l.user_id IS NOT NULL) AS liked_by_me
         FROM exercises e
         LEFT JOIN exercise_likes l
           ON l.exercise_id = e.id AND l.user_id = $1
         ${whereClause}
         ORDER BY e.id
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params,
    )

    const items = r.rows.map((row) => ({
        ...mapSystemExercise(row),
        likedByMe: row.liked_by_me === true,
    }))

    const nextOffset = offset + items.length < total ? offset + items.length : null
    return { items, total, nextOffset }
}

// ---------------------------------------------------------------------------
// Likes
// ---------------------------------------------------------------------------
export async function likeExercise(
    userId: string,
    exerciseId: string,
): Promise<void> {
    await pool.query(
        `INSERT INTO exercise_likes (user_id, exercise_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id, exercise_id) DO NOTHING`,
        [userId, exerciseId],
    )
}

export async function unlikeExercise(
    userId: string,
    exerciseId: string,
): Promise<void> {
    await pool.query(
        `DELETE FROM exercise_likes
         WHERE user_id = $1 AND exercise_id = $2`,
        [userId, exerciseId],
    )
}

// Workout generator stays system-only by design (predictable plans).
export async function listForGenerator(input: {
    allowedEquipment: string[]
    allowedLevels: string[]
}): Promise<Exercise[]> {
    // Sort inputs so different argument orderings hit the same key.
    const equipment = [...input.allowedEquipment].sort()
    const levels = [...input.allowedLevels].sort()
    const key = `ex:sys:gen:${levels.join(",")}|${equipment.join(",")}`
    return cached(key, SYSTEM_TTL_SEC, async () => {
        const result = await pool.query(
            `SELECT * FROM exercises
             WHERE category = 'strength'
               AND level = ANY($1::text[])
               AND (equipment IS NULL OR equipment = ANY($2::text[]))
             ORDER BY name ASC`,
            [levels, equipment],
        )
        return result.rows.map(mapSystemExercise)
    })
}
