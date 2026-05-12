import { z } from "zod"
import { HttpError } from "../../../utils/http-error.js"
import {
    chatCompletion,
    isGroqConfigured,
} from "../../coach/service/groq.client.js"
import { listForGenerator } from "../../exercises/service/exercises.service.js"
import { getOrCreateProfile } from "../../profile/service/profile.service.js"
import {
    EQUIPMENT_ALLOWED,
    LEVEL_ALLOWED,
} from "./generator.service.js"
import {
    persistGeneratedPlan,
} from "./workout.service.js"
import type {
    GeneratedDay,
    GeneratedExercise,
    GeneratedPlan,
    SplitType,
    WorkoutPlan,
} from "../workout.types.js"
import type { Exercise } from "../../exercises/exercises.types.js"

/**
 * AI plan generator.
 *
 * Takes the user's profile + filtered exercise pool, asks Groq to compose
 * a structured plan (in JSON mode), validates the response with Zod,
 * resolves the model's exercise slugs back to system ids, then hands the
 * result to the same persistence path used by the rule-based generator.
 *
 * If the model returns garbage / no usable exercises we throw 502 rather
 * than persisting a broken plan — the caller can fall back to the
 * rule-based generator.
 */

// Hard caps so a hallucinating model can't produce a 50-day plan.
const MAX_DAYS = 7
const MAX_EXERCISES_PER_DAY = 8

const SPLIT_TYPES = [
    "full_body",
    "upper_lower",
    "push_pull_legs",
    "bro_split",
    "custom",
] as const

const aiPlanSchema = z.object({
    splitType: z.enum(SPLIT_TYPES),
    days: z
        .array(
            z.object({
                name: z.string().min(1).max(40),
                weekdayHint: z.number().int().min(0).max(6).nullable(),
                exercises: z
                    .array(
                        z.object({
                            slug: z.string().min(1),
                            targetSets: z.number().int().min(1).max(10),
                            targetRepsMin: z.number().int().min(1).max(50),
                            targetRepsMax: z.number().int().min(1).max(50),
                            restSeconds: z
                                .number()
                                .int()
                                .min(0)
                                .max(600)
                                .nullable()
                                .optional(),
                            targetRpe: z
                                .number()
                                .min(1)
                                .max(10)
                                .nullable()
                                .optional(),
                        }),
                    )
                    .max(MAX_EXERCISES_PER_DAY)
                    .min(1),
            }),
        )
        .min(1)
        .max(MAX_DAYS),
})

type AiPlan = z.infer<typeof aiPlanSchema>

export async function generatePlanWithAI(userId: string): Promise<WorkoutPlan> {
    if (!isGroqConfigured()) {
        throw new HttpError(503, "ai_not_configured")
    }

    const profile = await getOrCreateProfile(userId)
    if (
        !profile.experienceLevel ||
        !profile.trainingDaysPerWeek ||
        !profile.equipmentAccess ||
        !profile.goal
    ) {
        throw new HttpError(
            400,
            "Complete onboarding before generating a plan",
        )
    }

    const allowedEquipment = EQUIPMENT_ALLOWED[profile.equipmentAccess]
    const allowedLevels = LEVEL_ALLOWED[profile.experienceLevel]
    const pool = await listForGenerator({ allowedEquipment, allowedLevels })
    if (pool.length === 0) {
        throw new HttpError(
            500,
            "No exercises match your equipment + level — seed may be missing",
        )
    }

    const aiPlan = await askGroqForPlan({
        profile: {
            level: profile.experienceLevel,
            daysPerWeek: profile.trainingDaysPerWeek,
            equipment: profile.equipmentAccess,
            goal: profile.goal,
        },
        pool,
    })

    const generated = toGeneratedPlan(aiPlan, pool, profile.goal, profile.trainingDaysPerWeek)
    if (generated.days.every((d) => d.exercises.length === 0)) {
        throw new HttpError(
            502,
            "AI returned no usable exercises — try again or use the standard generator",
        )
    }

    return persistGeneratedPlan(userId, generated)
}

// ---------------------------------------------------------------------------
// Groq call
// ---------------------------------------------------------------------------

async function askGroqForPlan(args: {
    profile: {
        level: string
        daysPerWeek: number
        equipment: string
        goal: string
    }
    pool: Exercise[]
}): Promise<AiPlan> {
    // Groq's free-tier TPM limit (12k) forces us to shrink the pool hard:
    // we cap to ~8 exercises per primary muscle, compounds first, and
    // render the result as TSV (one line per exercise) instead of JSON
    // objects. That brings the pool from ~19k tokens to under 2k.
    const poolText = renderPoolTSV(shrinkPool(args.pool))

    const systemPrompt = [
        "You are an experienced strength coach designing a weekly training plan.",
        "Pick exercises ONLY from the provided pool — refer to them by their slug (first column).",
        "Match the user's experience, equipment, days-per-week, and goal.",
        "Cover all major muscle groups across the week; avoid duplicating the same compound on consecutive days.",
        `Produce ${args.profile.daysPerWeek} day(s). weekdayHint is 0..6 where 0=Mon, 6=Sun.`,
        "Pick a splitType: full_body | upper_lower | push_pull_legs | bro_split | custom.",
        "Reply with ONLY a JSON object matching the schema, no prose, no markdown.",
    ].join(" ")

    // User prompt: profile + pool + minimal schema hint. Keep it tight —
    // every extra token here counts against TPM.
    const userPrompt = [
        `profile: ${JSON.stringify(args.profile)}`,
        "",
        "pool (TSV: slug<TAB>name<TAB>muscle<TAB>equipment):",
        poolText,
        "",
        'schema: { "splitType": "...", "days": [{ "name": "...", "weekdayHint": 0..6|null, "exercises": [{ "slug": "...", "targetSets": int, "targetRepsMin": int, "targetRepsMax": int, "restSeconds": int|null, "targetRpe": number|null }] }] }',
    ].join("\n")

    const raw = await chatCompletion({
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
        ],
        responseFormat: "json_object",
        temperature: 0.4,
        maxTokens: 2000,
    })

    let parsed: unknown
    try {
        parsed = JSON.parse(raw)
    } catch {
        throw new HttpError(502, "AI returned malformed JSON")
    }
    const result = aiPlanSchema.safeParse(parsed)
    if (!result.success) {
        throw new HttpError(502, "AI plan failed schema validation")
    }
    return result.data
}

// ---------------------------------------------------------------------------
// Pool compaction — keep this aggressive: TPM budget is the bottleneck.
// ---------------------------------------------------------------------------

// Per-muscle cap. With ~10 distinct primary muscles in the seed catalog
// (chest, back, shoulders, biceps, triceps, quadriceps, hamstrings,
// glutes, calves, abs/core), 8/muscle ≈ ~80 exercises ≈ ~1.5k tokens.
const PER_MUSCLE_CAP = 8
const ABSOLUTE_CAP = 120

function shrinkPool(pool: Exercise[]): Exercise[] {
    // Bucket by first primary muscle. Exercises with no primary muscle
    // tagged go into "_other" so they're not silently dropped.
    const buckets = new Map<string, Exercise[]>()
    for (const ex of pool) {
        const key = ex.primaryMuscles[0]?.toLowerCase() ?? "_other"
        const bucket = buckets.get(key) ?? []
        bucket.push(ex)
        buckets.set(key, bucket)
    }

    // Within each bucket: compounds before isolation, then alphabetical
    // so output is stable (cache-friendly on repeat regens).
    const out: Exercise[] = []
    for (const bucket of buckets.values()) {
        bucket.sort((a, b) => {
            const aCompound = a.mechanic === "compound" ? 0 : 1
            const bCompound = b.mechanic === "compound" ? 0 : 1
            if (aCompound !== bCompound) return aCompound - bCompound
            return a.name.localeCompare(b.name)
        })
        out.push(...bucket.slice(0, PER_MUSCLE_CAP))
    }

    // Final safety cap so an unexpected explosion of muscle keys can't
    // blow past the token budget.
    return out.slice(0, ABSOLUTE_CAP)
}

function renderPoolTSV(pool: Exercise[]): string {
    // One line per exercise. TSV is ~3-4× denser than the equivalent JSON
    // (no braces, no quoted keys, no key repetition).
    return pool
        .map((e) => {
            const muscle = e.primaryMuscles[0] ?? ""
            const equipment = e.equipment ?? ""
            return `${e.slug}\t${e.name}\t${muscle}\t${equipment}`
        })
        .join("\n")
}

// ---------------------------------------------------------------------------
// AI shape → GeneratedPlan
// ---------------------------------------------------------------------------

function toGeneratedPlan(
    ai: AiPlan,
    pool: Exercise[],
    goal: string,
    daysPerWeek: number,
): GeneratedPlan {
    const bySlug = new Map(pool.map((e) => [e.slug, e]))

    const days: GeneratedDay[] = ai.days.map((d, dayIndex) => {
        const exercises: GeneratedExercise[] = []
        let position = 0
        for (const ex of d.exercises) {
            // Drop anything the model hallucinated — it has to be a slug we
            // actually serve. Keeps invariants tight on the persist layer.
            const known = bySlug.get(ex.slug)
            if (!known) continue
            const repsMin = Math.min(ex.targetRepsMin, ex.targetRepsMax)
            const repsMax = Math.max(ex.targetRepsMin, ex.targetRepsMax)
            exercises.push({
                exerciseId: known.id,
                position: position++,
                targetSets: ex.targetSets,
                targetRepsMin: repsMin,
                targetRepsMax: repsMax,
                targetRpe: ex.targetRpe ?? null,
                restSeconds: ex.restSeconds ?? null,
            })
        }
        return {
            dayIndex,
            name: d.name,
            weekdayHint: d.weekdayHint,
            exercises,
        }
    })

    return {
        splitType: ai.splitType as SplitType,
        daysPerWeek,
        goal,
        days,
    }
}
