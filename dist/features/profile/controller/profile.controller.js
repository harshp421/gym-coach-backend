import * as profileService from "../service/profile.service.js";
import { userId } from "../../../utils/req-helpers.js";
// GET /api/v1/profile
export async function getProfile(req, res) {
    const profile = await profileService.getOrCreateProfile(userId(req));
    res.json({
        profile,
        completedOnboarding: profile.onboardingCompletedAt != null,
    });
}
// PUT /api/v1/profile
export async function updateProfile(req, res) {
    const profile = await profileService.updateProfile(userId(req), req.body);
    res.json({ profile });
}
// POST /api/v1/profile/complete-onboarding
export async function completeOnboarding(req, res) {
    const result = await profileService.completeOnboarding(userId(req), req.body);
    res.status(201).json(result);
}
// GET /api/v1/body-metrics?limit=30&before=YYYY-MM-DD
export async function listBodyMetrics(req, res) {
    const rawLimit = parseInt(String(req.query.limit ?? "30"), 10);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 30;
    const before = typeof req.query.before === "string" && /^\d{4}-\d{2}-\d{2}$/.test(req.query.before)
        ? req.query.before
        : undefined;
    const metrics = await profileService.listBodyMetrics(userId(req), { limit, before });
    res.json({ metrics });
}
// POST /api/v1/body-metrics
export async function addBodyMetric(req, res) {
    const metric = await profileService.upsertBodyMetric(userId(req), req.body);
    res.status(201).json({ metric });
}
//# sourceMappingURL=profile.controller.js.map