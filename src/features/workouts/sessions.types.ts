export type WorkoutSession = {
    id: string
    userId: string
    planId: string
    planDayId: string
    startedAt: string
    completedAt: string | null
    notes: string | null
    createdAt: string
    updatedAt: string
}

export type SetLog = {
    id: string
    sessionId: string
    planExerciseId: string
    setNumber: number
    weightKg: number | null
    reps: number
    rpe: number | null
    notes: string | null
    loggedAt: string
}

// Set log with the on-the-fly PR flag attached. Returned by the history
// endpoint only; live writes return a bare SetLog.
export type SetLogWithPr = SetLog & { isPr: boolean }

export type WorkoutSessionWithSets = WorkoutSession & {
    sets: SetLog[]
}

// Aggregates that ride along with the recent-sessions list so the
// dashboard / progress view don't need an extra round trip per session.
export type SessionSummary = {
    totalSets: number
    totalReps: number
    totalVolumeKg: number
}

export type WorkoutSessionListItem = WorkoutSession & {
    summary: SessionSummary
}

// One entry per session that included the exercise — used by the
// per-exercise history endpoint. Cross-plan: archived plan_exercises that
// share the same underlying exercise are included.
export type ExerciseHistoryEntry = {
    sessionId: string
    startedAt: string
    completedAt: string | null
    sets: SetLogWithPr[]
}
