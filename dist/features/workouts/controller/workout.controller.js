import * as workoutService from "../service/workout.service.js";
import { userId } from "../../../utils/req-helpers.js";
// GET /api/v1/workouts/plan
export async function getPlan(req, res) {
    const plan = await workoutService.getActivePlan(userId(req));
    if (!plan) {
        return res.json({ plan: null });
    }
    res.json({ plan });
}
// POST /api/v1/workouts/plan/generate
export async function generatePlan(req, res) {
    const plan = await workoutService.regeneratePlanForUser(userId(req));
    res.status(201).json({ plan });
}
// GET /api/v1/workouts/plan/today
export async function getToday(req, res) {
    const result = await workoutService.getTodayForUser(userId(req));
    if (!result)
        return res.json({ plan: null, todayDayIndex: null });
    res.json(result);
}
// Swap moved to plan-edit.controller.updateExercise (PATCH /plan/exercises/:id).
//# sourceMappingURL=workout.controller.js.map