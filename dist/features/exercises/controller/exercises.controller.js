import * as exerciseService from "../service/exercises.service.js";
import { HttpError } from "../../../utils/http-error.js";
import { paramId } from "../../../utils/req-helpers.js";
const ALLOWED_LEVELS = new Set(["beginner", "intermediate", "advanced"]);
const ALLOWED_MECHANICS = new Set(["compound", "isolation"]);
const ALLOWED_SOURCES = new Set(["all", "system", "user"]);
function asString(v) {
    return typeof v === "string" && v.length ? v : undefined;
}
// GET /api/v1/exercises
export async function listExercises(req, res) {
    const muscle = asString(req.query.muscle);
    const equipment = asString(req.query.equipment);
    const levelRaw = asString(req.query.level);
    const mechanicRaw = asString(req.query.mechanic);
    const category = asString(req.query.category);
    const q = asString(req.query.q);
    const sourceRaw = asString(req.query.source);
    const limit = parseInt(String(req.query.limit ?? "30"), 10) || 30;
    const offset = parseInt(String(req.query.offset ?? "0"), 10) || 0;
    const level = levelRaw && ALLOWED_LEVELS.has(levelRaw) ? levelRaw : undefined;
    const mechanic = mechanicRaw && ALLOWED_MECHANICS.has(mechanicRaw) ? mechanicRaw : undefined;
    const source = sourceRaw && ALLOWED_SOURCES.has(sourceRaw) ? sourceRaw : "all";
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
    });
    res.json(result);
}
// GET /api/v1/exercises/:slug
export async function getExercise(req, res) {
    const slug = paramId(req, "slug");
    const exercise = await exerciseService.findExerciseBySlug(slug);
    if (!exercise)
        throw new HttpError(404, "Exercise not found");
    res.json({ exercise });
}
//# sourceMappingURL=exercises.controller.js.map