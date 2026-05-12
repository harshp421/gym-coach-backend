import * as sessionsService from "../service/sessions.service.js";
import * as historyService from "../service/history.service.js";
import { paramId, userId } from "../../../utils/req-helpers.js";
// POST /api/v1/workouts/sessions
export async function createSession(req, res) {
    const session = await sessionsService.createSession(userId(req), req.body.planDayId);
    res.status(201).json({ session });
}
// GET /api/v1/workouts/sessions/active
export async function getActiveSession(req, res) {
    const session = await sessionsService.getActiveSession(userId(req));
    res.json({ session });
}
// GET /api/v1/workouts/sessions/:id
export async function getSession(req, res) {
    const session = await sessionsService.getSession(userId(req), paramId(req, "id"));
    res.json({ session });
}
// PATCH /api/v1/workouts/sessions/:id/complete
export async function completeSession(req, res) {
    const session = await sessionsService.completeSession(userId(req), paramId(req, "id"), req.body);
    res.json({ session });
}
// DELETE /api/v1/workouts/sessions/:id
export async function abandonSession(req, res) {
    await sessionsService.abandonSession(userId(req), paramId(req, "id"));
    res.status(204).send();
}
// POST /api/v1/workouts/sessions/:id/sets
export async function logSet(req, res) {
    const setLog = await sessionsService.upsertSetLog(userId(req), paramId(req, "id"), req.body);
    res.status(201).json({ setLog });
}
// DELETE /api/v1/workouts/sessions/:id/sets/:setLogId
export async function deleteSet(req, res) {
    await sessionsService.deleteSetLog(userId(req), paramId(req, "id"), paramId(req, "setLogId"));
    res.status(204).send();
}
// GET /api/v1/workouts/sessions?limit=N&before=ISO
export async function listRecentSessions(req, res) {
    const rawLimit = parseInt(String(req.query.limit ?? "20"), 10);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 20;
    const before = typeof req.query.before === "string" ? req.query.before : undefined;
    const result = await historyService.listRecentSessions(userId(req), { limit, before });
    res.json(result);
}
// GET /api/v1/workouts/exercises/:planExerciseId/history?limit=N
export async function getExerciseHistory(req, res) {
    const rawLimit = parseInt(String(req.query.limit ?? "10"), 10);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 50) : 10;
    const result = await historyService.getExerciseHistory(userId(req), paramId(req, "planExerciseId"), limit);
    res.json(result);
}
//# sourceMappingURL=sessions.controller.js.map