import { pool } from "../../../config/dbConnect.js";
import { getActivePlan } from "../../workouts/service/workout.service.js";
import { listRecentSessions } from "../../workouts/service/history.service.js";
import { getOrCreateProfile } from "../../profile/service/profile.service.js";
import { listUserExercises } from "../../exercises/service/user-exercises.service.js";
import { SPLIT_LABEL } from "./split-label.js";
const WEEKDAY = [
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat",
    "Sun",
];
const fmtDate = (iso) => {
    try {
        const d = typeof iso === "string" ? new Date(iso) : iso;
        return d.toISOString().slice(0, 10);
    }
    catch {
        return String(iso).slice(0, 10);
    }
};
/**
 * Build the system prompt that primes the coach. Caps each section so a
 * very-active user never blows out the context window. We shoot for
 * <2000 tokens — well below Llama-3.3-70b's 128k limit but fast and cheap.
 */
export async function buildSystemPrompt(userId, name) {
    const [profile, plan, recent, metrics, customs] = await Promise.all([
        getOrCreateProfile(userId).catch(() => null),
        getActivePlan(userId).catch(() => null),
        listRecentSessions(userId, { limit: 10 }).catch(() => ({
            items: [],
            nextBefore: null,
        })),
        listRecentBodyMetrics(userId, 10).catch(() => []),
        listUserExercises(userId, { includeArchived: false }).catch(() => []),
    ]);
    const lines = [];
    const who = name ? name.split(" ")[0] : "this user";
    lines.push(`You are an AI gym coach for ${who}. Be concise and direct. Don't quote the prescription back at them — they can see it. Focus on what to do next.`, "");
    if (profile) {
        lines.push("Profile:");
        lines.push(`- Goal: ${profile.goal ?? "—"}${profile.targetWeightKg ? ` (target ${profile.targetWeightKg}kg)` : ""}`);
        lines.push(`- Level: ${profile.experienceLevel ?? "—"}, ${profile.trainingDaysPerWeek ?? "—"}/wk`);
        lines.push(`- Equipment: ${profile.equipmentAccess ?? "—"}`);
        const allergies = profile.allergies?.length
            ? `, avoids: ${profile.allergies.join(", ")}`
            : "";
        lines.push(`- Diet: ${profile.dietType ?? "—"}${allergies}`);
        lines.push(`- Units: ${profile.units}`);
        lines.push("");
    }
    if (plan) {
        const split = SPLIT_LABEL[plan.splitType] ?? plan.splitType;
        const planName = plan.name ? ` "${plan.name}"` : "";
        lines.push(`Active plan${planName}: ${split} (${plan.daysPerWeek} days/wk)`);
        lines.push("Days:");
        for (const day of plan.days) {
            const weekday = day.weekdayHint != null
                ? WEEKDAY[day.weekdayHint] ?? "Any"
                : "Any";
            const exes = day.exercises
                .map((pe) => `${pe.exercise.name} ${pe.targetSets}×${pe.targetRepsMin}–${pe.targetRepsMax}`)
                .join("; ");
            lines.push(`- ${day.name} (${weekday}): ${exes || "(empty)"}`);
        }
        lines.push("");
    }
    else {
        lines.push("Active plan: none yet — they haven't generated one.");
        lines.push("");
    }
    if (recent.items.length > 0) {
        lines.push(`Recent sessions (last ${recent.items.length}):`);
        for (const s of recent.items) {
            const status = s.completedAt ? "" : " (in progress)";
            const vol = s.summary.totalVolumeKg > 0
                ? `, ${Math.round(s.summary.totalVolumeKg)}kg volume`
                : "";
            lines.push(`- ${fmtDate(s.startedAt)}: ${s.summary.totalSets} sets${vol}${status}`);
        }
        lines.push("");
    }
    if (metrics.length > 0) {
        lines.push("Recent body metrics:");
        for (const m of metrics) {
            const parts = [];
            if (m.weightKg !== null)
                parts.push(`${m.weightKg}kg`);
            if (m.bodyFatPct !== null)
                parts.push(`${m.bodyFatPct}% bf`);
            if (m.waistCm !== null)
                parts.push(`${m.waistCm}cm waist`);
            lines.push(`- ${m.recordedAt}: ${parts.join(", ")}`);
        }
        lines.push("");
    }
    if (customs.length > 0) {
        const names = customs.map((c) => `"${c.name}"`).join(", ");
        lines.push(`User's custom exercises (${customs.length}): ${names}. Use those names exactly when referring to them.`);
        lines.push("");
    }
    lines.push("If you suggest a plan tweak, give the change clearly enough that the user can apply it themselves in the plan editor. Don't format the response as a template — just answer.");
    return lines.join("\n");
}
async function listRecentBodyMetrics(userId, limit) {
    const r = await pool.query(`SELECT recorded_at, weight_kg, body_fat_pct, waist_cm
         FROM body_metrics
         WHERE user_id = $1
         ORDER BY recorded_at DESC
         LIMIT $2`, [userId, limit]);
    return r.rows.map((row) => ({
        recordedAt: typeof row.recorded_at === "string"
            ? row.recorded_at
            : new Date(row.recorded_at).toISOString().slice(0, 10),
        weightKg: row.weight_kg == null ? null : Number(row.weight_kg),
        bodyFatPct: row.body_fat_pct == null ? null : Number(row.body_fat_pct),
        waistCm: row.waist_cm == null ? null : Number(row.waist_cm),
    }));
}
//# sourceMappingURL=context.service.js.map