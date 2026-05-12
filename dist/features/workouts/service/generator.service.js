// Rule-based plan generator. Pure functions — no DB access, no Express, no
// IO. Takes a profile + filtered exercise pool, returns a structured plan.
// Easy to unit-test in isolation.
// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
export const EQUIPMENT_ALLOWED = {
    full_gym: [
        "barbell",
        "dumbbell",
        "cable",
        "machine",
        "kettlebells",
        "body only",
        "bands",
        "medicine ball",
        "exercise ball",
        "foam roll",
        "e-z curl bar",
        "other",
    ],
    home_basic: [
        "barbell",
        "dumbbell",
        "body only",
        "bands",
        "kettlebells",
        "medicine ball",
        "exercise ball",
        "e-z curl bar",
    ],
    dumbbells_only: ["dumbbell", "body only", "bands"],
    bodyweight: ["body only", "bands"],
};
export const LEVEL_ALLOWED = {
    beginner: ["beginner"],
    intermediate: ["beginner", "intermediate"],
    advanced: ["beginner", "intermediate", "advanced"],
};
const SLOTS_PER_DAY = {
    beginner: 4,
    intermediate: 5,
    advanced: 6,
};
const REP_SCHEMES = {
    cut: {
        compound: { sets: 3, reps: [8, 12] },
        isolation: { sets: 3, reps: [12, 15] },
        rpe: 8,
    },
    maintain: {
        compound: { sets: 3, reps: [8, 10] },
        isolation: { sets: 3, reps: [10, 12] },
        rpe: 7,
    },
    bulk: {
        compound: { sets: 4, reps: [6, 10] },
        isolation: { sets: 3, reps: [10, 12] },
        rpe: 8,
    },
    recomp: {
        compound: { sets: 3, reps: [8, 12] },
        isolation: { sets: 3, reps: [10, 15] },
        rpe: 7.5,
    },
};
// What muscle groups (in dataset's taxonomy) define each day type.
// Order matters — earlier muscles are prioritized when picking compounds.
const DAY_FOCUS = {
    "Full body": [
        "quadriceps",
        "hamstrings",
        "glutes",
        "chest",
        "lats",
        "middle back",
        "shoulders",
        "biceps",
        "triceps",
    ],
    "Full body A": [
        "quadriceps",
        "chest",
        "lats",
        "middle back",
        "shoulders",
    ],
    "Full body B": [
        "hamstrings",
        "glutes",
        "chest",
        "lats",
        "shoulders",
        "biceps",
        "triceps",
    ],
    "Full body C": [
        "quadriceps",
        "hamstrings",
        "glutes",
        "chest",
        "middle back",
    ],
    Push: ["chest", "shoulders", "triceps"],
    Pull: ["lats", "middle back", "lower back", "biceps", "traps"],
    Legs: ["quadriceps", "hamstrings", "glutes", "calves"],
    "Push A": ["chest", "shoulders", "triceps"],
    "Push B": ["chest", "shoulders", "triceps"],
    "Pull A": ["lats", "middle back", "biceps"],
    "Pull B": ["lats", "middle back", "biceps", "traps"],
    "Legs A": ["quadriceps", "hamstrings", "glutes"],
    "Legs B": ["hamstrings", "glutes", "calves"],
    Upper: ["chest", "lats", "middle back", "shoulders", "biceps", "triceps"],
    Lower: ["quadriceps", "hamstrings", "glutes", "calves"],
    "Upper A": [
        "chest",
        "lats",
        "middle back",
        "shoulders",
        "biceps",
        "triceps",
    ],
    "Lower A": ["quadriceps", "hamstrings", "glutes"],
    "Upper B": [
        "chest",
        "lats",
        "shoulders",
        "biceps",
        "triceps",
    ],
    "Lower B": ["hamstrings", "glutes", "calves"],
    Recovery: [
        "lower back",
        "core",
        "abdominals",
        "calves",
    ],
};
function pickSplit(daysPerWeek, experience) {
    switch (daysPerWeek) {
        case 1:
            return { splitType: "full_body", days: ["Full body"] };
        case 2:
            return {
                splitType: "full_body",
                days: ["Full body A", "Full body B"],
            };
        case 3:
            return experience === "beginner"
                ? {
                    splitType: "full_body",
                    days: ["Full body A", "Full body B", "Full body C"],
                }
                : {
                    splitType: "push_pull_legs",
                    days: ["Push", "Pull", "Legs"],
                };
        case 4:
            return {
                splitType: "upper_lower",
                days: ["Upper A", "Lower A", "Upper B", "Lower B"],
            };
        case 5:
            return {
                splitType: "custom",
                days: ["Push", "Pull", "Legs", "Upper", "Lower"],
            };
        case 6:
            return {
                splitType: "push_pull_legs",
                days: [
                    "Push A",
                    "Pull A",
                    "Legs A",
                    "Push B",
                    "Pull B",
                    "Legs B",
                ],
            };
        case 7:
            return {
                splitType: "push_pull_legs",
                days: [
                    "Push A",
                    "Pull A",
                    "Legs A",
                    "Push B",
                    "Pull B",
                    "Legs B",
                    "Recovery",
                ],
            };
        default:
            return { splitType: "full_body", days: ["Full body"] };
    }
}
// ---------------------------------------------------------------------------
// Exercise picking per day
// ---------------------------------------------------------------------------
function pickExercisesForDay(pool, dayName, slotCount) {
    const focus = DAY_FOCUS[dayName] ?? [];
    if (focus.length === 0)
        return [];
    // Filter to exercises whose primary muscle is in the day's focus.
    const matches = pool.filter((e) => e.primaryMuscles.some((m) => focus.includes(m)));
    // Sort: compounds first, then by focus-priority (earlier = higher),
    // then by name for deterministic output.
    matches.sort((a, b) => {
        const aCompound = a.mechanic === "compound" ? 0 : 1;
        const bCompound = b.mechanic === "compound" ? 0 : 1;
        if (aCompound !== bCompound)
            return aCompound - bCompound;
        const aPri = focusRank(a.primaryMuscles, focus);
        const bPri = focusRank(b.primaryMuscles, focus);
        if (aPri !== bPri)
            return aPri - bPri;
        return a.name.localeCompare(b.name);
    });
    // Walk through, picking unique-by-primary-muscle until we run out of
    // distinct focus muscles, then fill remaining slots with isolations.
    const picked = [];
    const usedPrimaries = new Set();
    // Pass 1 — one compound per focus muscle (in order).
    for (const ex of matches) {
        if (picked.length >= slotCount)
            break;
        if (ex.mechanic !== "compound")
            continue;
        const primary = ex.primaryMuscles[0];
        if (!primary)
            continue;
        if (usedPrimaries.has(primary))
            continue;
        if (!focus.includes(primary))
            continue;
        picked.push(ex);
        usedPrimaries.add(primary);
    }
    // Pass 2 — fill with isolations on focus muscles.
    for (const ex of matches) {
        if (picked.length >= slotCount)
            break;
        if (picked.includes(ex))
            continue;
        if (ex.mechanic !== "isolation")
            continue;
        const primary = ex.primaryMuscles[0];
        if (!primary || !focus.includes(primary))
            continue;
        picked.push(ex);
    }
    // Pass 3 — fill any remaining slots with anything matching focus
    // (covers small equipment pools like bodyweight where isolations are rare).
    for (const ex of matches) {
        if (picked.length >= slotCount)
            break;
        if (picked.includes(ex))
            continue;
        picked.push(ex);
    }
    return picked;
}
function focusRank(primaryMuscles, focus) {
    let best = focus.length;
    for (const m of primaryMuscles) {
        const idx = focus.indexOf(m);
        if (idx >= 0 && idx < best)
            best = idx;
    }
    return best;
}
// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------
export function generatePlan(profile, pool) {
    const { splitType, days } = pickSplit(profile.trainingDaysPerWeek, profile.experienceLevel);
    const slots = SLOTS_PER_DAY[profile.experienceLevel];
    const reps = REP_SCHEMES[profile.goal];
    const planDays = days.map((dayName, dayIndex) => {
        const exercises = pickExercisesForDay(pool, dayName, slots);
        const generatedExercises = exercises.map((ex, position) => {
            const isCompound = ex.mechanic === "compound";
            const scheme = isCompound ? reps.compound : reps.isolation;
            return {
                exerciseId: ex.id,
                position,
                targetSets: scheme.sets,
                targetRepsMin: scheme.reps[0],
                targetRepsMax: scheme.reps[1],
                targetRpe: reps.rpe,
                restSeconds: isCompound ? 120 : 75,
            };
        });
        return {
            dayIndex,
            name: dayName,
            weekdayHint: null,
            exercises: generatedExercises,
        };
    });
    return {
        splitType,
        daysPerWeek: profile.trainingDaysPerWeek,
        goal: profile.goal,
        days: planDays,
    };
}
//# sourceMappingURL=generator.service.js.map