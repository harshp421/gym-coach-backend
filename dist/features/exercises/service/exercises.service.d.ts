import type { Exercise, ExerciseListQuery, ExerciseListResult } from "../exercises.types.js";
type Source = "all" | "system" | "user";
export declare function listExercises(q: ExerciseListQuery & {
    userId?: string;
    source?: Source;
}): Promise<ExerciseListResult>;
export declare function findExerciseBySlug(slug: string): Promise<Exercise | null>;
export declare function findExerciseById(id: string): Promise<Exercise | null>;
/**
 * Look up an exercise by id from either table, scoped to the user for the
 * user_exercises side. Used by plan-edit to hydrate `Exercise` regardless
 * of which catalog the plan_exercise points at.
 */
export declare function findExerciseAnywhere(userId: string, args: {
    exerciseId?: string | null;
    userExerciseId?: string | null;
}): Promise<Exercise | null>;
export declare function listForGenerator(input: {
    allowedEquipment: string[];
    allowedLevels: string[];
}): Promise<Exercise[]>;
export {};
//# sourceMappingURL=exercises.service.d.ts.map