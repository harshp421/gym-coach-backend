export type WorkoutSession = {
    id: string;
    userId: string;
    planId: string;
    planDayId: string;
    startedAt: string;
    completedAt: string | null;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
};
export type SetLog = {
    id: string;
    sessionId: string;
    planExerciseId: string;
    setNumber: number;
    weightKg: number | null;
    reps: number;
    rpe: number | null;
    notes: string | null;
    loggedAt: string;
};
export type SetLogWithPr = SetLog & {
    isPr: boolean;
};
export type WorkoutSessionWithSets = WorkoutSession & {
    sets: SetLog[];
};
export type SessionSummary = {
    totalSets: number;
    totalReps: number;
    totalVolumeKg: number;
};
export type WorkoutSessionListItem = WorkoutSession & {
    summary: SessionSummary;
};
export type ExerciseHistoryEntry = {
    sessionId: string;
    startedAt: string;
    completedAt: string | null;
    sets: SetLogWithPr[];
};
//# sourceMappingURL=sessions.types.d.ts.map