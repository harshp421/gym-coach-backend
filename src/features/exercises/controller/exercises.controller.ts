import type { Request, Response } from "express"
import * as exerciseService from "../service/exercises.service.js"
import { HttpError } from "../../../utils/http-error.js"
import { paramId, userId } from "../../../utils/req-helpers.js"

const ALLOWED_LEVELS = new Set(["beginner", "intermediate", "advanced"])
const ALLOWED_MECHANICS = new Set(["compound", "isolation"])
const ALLOWED_SOURCES = new Set(["all", "system", "user"])

function asString(v: unknown): string | undefined {
    return typeof v === "string" && v.length ? v : undefined
}

// GET /api/v1/exercises
export async function listExercises(req: Request, res: Response) {
    const muscle = asString(req.query.muscle)
    const equipment = asString(req.query.equipment)
    const levelRaw = asString(req.query.level)
    const mechanicRaw = asString(req.query.mechanic)
    const category = asString(req.query.category)
    const q = asString(req.query.q)
    const sourceRaw = asString(req.query.source)
    const limit = parseInt(String(req.query.limit ?? "30"), 10) || 30
    const offset = parseInt(String(req.query.offset ?? "0"), 10) || 0

    const level = levelRaw && ALLOWED_LEVELS.has(levelRaw) ? (levelRaw as any) : undefined
    const mechanic =
        mechanicRaw && ALLOWED_MECHANICS.has(mechanicRaw) ? (mechanicRaw as any) : undefined
    const source =
        sourceRaw && ALLOWED_SOURCES.has(sourceRaw) ? (sourceRaw as any) : "all"

    const result = await exerciseService.listExercises({
        muscle,
        equipment,
        level,
        mechanic,
        category,
        q,
        limit,
        offset,
        source,
        userId: req.user?.id,
    })

    res.json(result)
}

// GET /api/v1/exercises/gallery
//   Image-first feed for the Discover gallery. Includes likedByMe per item.
export async function getGallery(req: Request, res: Response) {
    const muscle = asString(req.query.muscle)
    const equipment = asString(req.query.equipment)
    const levelRaw = asString(req.query.level)
    const mechanicRaw = asString(req.query.mechanic)
    const q = asString(req.query.q)
    const limit = parseInt(String(req.query.limit ?? "20"), 10) || 20
    const offset = parseInt(String(req.query.offset ?? "0"), 10) || 0

    const level = levelRaw && ALLOWED_LEVELS.has(levelRaw) ? (levelRaw as any) : undefined
    const mechanic =
        mechanicRaw && ALLOWED_MECHANICS.has(mechanicRaw)
            ? (mechanicRaw as any)
            : undefined

    const result = await exerciseService.galleryFeed(userId(req), {
        muscle,
        equipment,
        level,
        mechanic,
        q,
        limit,
        offset,
    })
    res.json(result)
}

// POST /api/v1/exercises/:id/like
export async function likeExercise(req: Request, res: Response) {
    const exerciseId = paramId(req, "id")
    await exerciseService.likeExercise(userId(req), exerciseId)
    res.json({ ok: true, likedByMe: true })
}

// DELETE /api/v1/exercises/:id/like
export async function unlikeExercise(req: Request, res: Response) {
    const exerciseId = paramId(req, "id")
    await exerciseService.unlikeExercise(userId(req), exerciseId)
    res.json({ ok: true, likedByMe: false })
}

// GET /api/v1/exercises/:slug
export async function getExercise(req: Request, res: Response) {
    const slug = paramId(req, "slug")
    const exercise = await exerciseService.findExerciseBySlug(slug)
    if (!exercise) throw new HttpError(404, "Exercise not found")
    res.json({ exercise })
}
