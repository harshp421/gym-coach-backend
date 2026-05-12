import * as userExerciseService from "../service/user-exercises.service.js";
import { paramId, userId } from "../../../utils/req-helpers.js";
// GET /api/v1/user-exercises
export async function listUserExercises(req, res) {
    const includeArchived = req.query.includeArchived === "1" ||
        req.query.includeArchived === "true";
    const items = await userExerciseService.listUserExercises(userId(req), {
        includeArchived,
    });
    res.json({ items });
}
// POST /api/v1/user-exercises
export async function createUserExercise(req, res) {
    const exercise = await userExerciseService.createUserExercise(userId(req), req.body);
    res.status(201).json({ exercise });
}
// PATCH /api/v1/user-exercises/:id
export async function updateUserExercise(req, res) {
    const exercise = await userExerciseService.updateUserExercise(userId(req), paramId(req, "id"), req.body);
    res.json({ exercise });
}
// POST /api/v1/user-exercises/:id/archive
export async function archiveUserExercise(req, res) {
    const exercise = await userExerciseService.archiveUserExercise(userId(req), paramId(req, "id"));
    res.json({ exercise });
}
// POST /api/v1/user-exercises/:id/restore
export async function restoreUserExercise(req, res) {
    const exercise = await userExerciseService.restoreUserExercise(userId(req), paramId(req, "id"));
    res.json({ exercise });
}
//# sourceMappingURL=user-exercises.controller.js.map