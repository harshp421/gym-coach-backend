// Seed a deterministic test user with profile, plan, body-metric history,
// completed workout sessions, set logs, and a custom exercise.
//
// Idempotent: re-running deletes the previous test user (cascades through
// every dependent table) and re-seeds from scratch.
//
//   npm run seed:test-user
//
// Login after seeding: panthchomu@gmail.com / panthchomu
import { closePool, pool } from "../src/config/dbConnect.js";
import { hashPassword } from "../src/utils/password.js";
import { regeneratePlanForUser } from "../src/features/workouts/service/workout.service.js";
const EMAIL = "panthchomu@gmail.com";
const PASSWORD = "panthchomu";
const NAME = "Panth";
const BODY_METRIC_DAYS = 14;
const NUM_SESSIONS = 10;
const SESSION_GAP_DAYS = 3; // ~10 sessions over the last 4 weeks
async function seed() {
    console.log(`[seed] preparing test user ${EMAIL}`);
    // 1. Sanity check — system exercises must already be seeded so the
    //    rule-based generator has a pool to draw from.
    const haveExercises = await pool.query(`SELECT COUNT(*)::int AS n FROM exercises`);
    if ((haveExercises.rows[0]?.n ?? 0) < 30) {
        throw new Error("Run `npm run seed:exercises` first — the plan generator needs the catalog.");
    }
    // 2. Wipe any previous test user. CASCADE handles profile, body_metrics,
    //    workout_plans (→ plan_days → plan_exercises), workout_sessions
    //    (→ set_logs), user_exercises, chat_sessions (→ chat_messages),
    //    accounts, password_resets, email_verifications.
    const wipe = await pool.query(`DELETE FROM users WHERE email = $1`, [EMAIL]);
    if (wipe.rowCount && wipe.rowCount > 0) {
        console.log(`[seed] removed existing test user`);
    }
    // 3. Create user, email-verified so OnboardingGate is happy.
    const passwordHash = await hashPassword(PASSWORD);
    const userInsert = await pool.query(`INSERT INTO users (email, password_hash, name, email_verified)
         VALUES ($1, $2, $3, now())
         RETURNING id`, [EMAIL, passwordHash, NAME]);
    const userId = userInsert.rows[0].id;
    console.log(`[seed] created user ${userId}`);
    // 4. Create profile — onboarding marked complete so the test user
    //    skips the wizard and lands on the dashboard.
    await pool.query(`INSERT INTO profiles (
            user_id, date_of_birth, sex, height_cm,
            goal, target_weight_kg, activity_level,
            experience_level, training_days_per_week, equipment_access,
            diet_type, allergies, dislikes,
            timezone, units, onboarding_completed_at
         ) VALUES (
            $1, '1995-04-15', 'male', 178,
            'cut', 75, 'moderate',
            'intermediate', 4, 'full_gym',
            'omnivore', $2, '{}',
            'Asia/Kolkata', 'metric', now()
         )`, [userId, ["nuts"]]);
    console.log(`[seed] profile ready (cut · intermediate · 4 days/wk · full gym)`);
    // 5. Body metrics — 14 days, mild downward weight trend (cut), every
    //    third day picks up a body-fat reading too.
    const today = new Date();
    for (let i = BODY_METRIC_DAYS - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dateIso = d.toISOString().slice(0, 10);
        // 81.6 → ~79.5 with light noise.
        const baseWeight = 81.6 - (BODY_METRIC_DAYS - 1 - i) * 0.15;
        const noise = (pseudoRandom(i) - 0.5) * 0.6;
        const weightKg = +(baseWeight + noise).toFixed(2);
        const includeBodyFat = i % 3 === 0;
        const bodyFatPct = includeBodyFat
            ? +(17.4 - (BODY_METRIC_DAYS - 1 - i) * 0.05).toFixed(1)
            : null;
        await pool.query(`INSERT INTO body_metrics (user_id, recorded_at, weight_kg, body_fat_pct)
             VALUES ($1, $2, $3, $4)`, [userId, dateIso, weightKg, bodyFatPct]);
    }
    console.log(`[seed] inserted ${BODY_METRIC_DAYS} body-metric rows`);
    // 6. Custom exercise so MyExercises and the picker have something to
    //    show on first visit.
    await pool.query(`INSERT INTO user_exercises (
            user_id, name, slug,
            primary_muscles, secondary_muscles,
            equipment, mechanic, level, instructions
         ) VALUES (
            $1, 'Heavy Cable Decline Fly', 'heavy-cable-decline-fly',
            ARRAY['chest']::text[], ARRAY['shoulders']::text[],
            'cable', 'isolation', 'intermediate',
            ARRAY[
                'Set both pulleys at the highest position.',
                'Keep elbows soft; squeeze the chest at the bottom.',
                'Control the negative — don''t let the cables yank you back.'
            ]::text[]
         )`, [userId]);
    console.log(`[seed] added 1 custom exercise`);
    // 7. Generate plan via the real generator so the data shape mirrors a
    //    real user. 4 days/wk + intermediate → upper_lower x 2 per the doc.
    const plan = await regeneratePlanForUser(userId);
    console.log(`[seed] generated plan: ${plan.splitType} × ${plan.daysPerWeek} days, ${plan.days.reduce((acc, d) => acc + d.exercises.length, 0)} total exercises`);
    // 8. Workout sessions — 10 completed sessions over the last ~30 days,
    //    cycling through plan days, with progressively heavier set logs so
    //    the progress chart shows a real curve.
    let totalSetsLogged = 0;
    for (let i = 0; i < NUM_SESSIONS; i++) {
        const dayIdx = i % plan.days.length;
        const day = plan.days[dayIdx];
        const daysAgo = (NUM_SESSIONS - 1 - i) * SESSION_GAP_DAYS;
        const startedAt = new Date(today);
        startedAt.setDate(today.getDate() - daysAgo);
        startedAt.setHours(18, 5, 0, 0);
        const completedAt = new Date(startedAt);
        completedAt.setMinutes(startedAt.getMinutes() + 60 + (i % 4) * 5);
        const sessionInsert = await pool.query(`INSERT INTO workout_sessions
                (user_id, plan_id, plan_day_id, started_at, completed_at)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id`, [
            userId,
            plan.id,
            day.id,
            startedAt.toISOString(),
            completedAt.toISOString(),
        ]);
        const sessionId = sessionInsert.rows[0].id;
        for (const pe of day.exercises) {
            const isCompound = pe.exercise.mechanic === "compound";
            const baseWeight = isCompound ? 60 : 14;
            // 2.5kg progression every 2 sessions on compounds, 1kg on isolations.
            const progression = isCompound
                ? Math.floor(i / 2) * 2.5
                : Math.floor(i / 2) * 1;
            const targetReps = Math.round((pe.targetRepsMin + pe.targetRepsMax) / 2);
            for (let setN = 1; setN <= pe.targetSets; setN++) {
                // Last set drops 1–2 reps to mimic accumulated fatigue.
                const reps = Math.max(pe.targetRepsMin, targetReps - Math.floor((setN - 1) / 2));
                const weight = baseWeight + progression;
                await pool.query(`INSERT INTO set_logs (
                        session_id, plan_exercise_id, set_number,
                        weight_kg, reps, rpe
                     ) VALUES ($1, $2, $3, $4, $5, $6)`, [
                    sessionId,
                    pe.id,
                    setN,
                    weight.toFixed(2),
                    reps,
                    7 + (setN === pe.targetSets ? 1 : 0),
                ]);
                totalSetsLogged++;
            }
        }
    }
    console.log(`[seed] inserted ${NUM_SESSIONS} sessions with ${totalSetsLogged} total sets`);
    console.log("");
    console.log("✓ test user ready");
    console.log(`  email:    ${EMAIL}`);
    console.log(`  password: ${PASSWORD}`);
}
// Deterministic noise so re-running produces the same dataset. Mulberry32-ish.
function pseudoRandom(seed) {
    let s = (seed * 1664525 + 1013904223) >>> 0;
    s = Math.imul(s ^ (s >>> 15), 2246822507) >>> 0;
    s = Math.imul(s ^ (s >>> 13), 3266489909) >>> 0;
    return ((s ^ (s >>> 16)) >>> 0) / 4294967296;
}
seed()
    .catch((err) => {
    console.error("[seed] failed:", err);
    process.exitCode = 1;
})
    .finally(() => closePool());
//# sourceMappingURL=seed-test-user.js.map