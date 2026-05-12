import type { ExerciseHistoryEntry, WorkoutSessionListItem } from "../sessions.types.js";
export declare function listRecentSessions(userId: string, opts: {
    limit: number;
    before?: string;
}): Promise<{
    items: WorkoutSessionListItem[];
    nextBefore: string | null;
}>;
export declare function getExerciseHistory(userId: string, planExerciseId: string, limit: number): Promise<{
    items: ExerciseHistoryEntry[];
}>;
//# sourceMappingURL=history.service.d.ts.map