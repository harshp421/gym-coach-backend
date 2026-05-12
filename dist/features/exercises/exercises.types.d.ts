export type ExerciseLevel = "beginner" | "intermediate" | "advanced";
export type ExerciseMechanic = "compound" | "isolation";
export type ExerciseForce = "push" | "pull" | "static";
/**
 * `system` = seeded read-only catalog (the `exercises` table).
 * `user`   = user-authored entry (the `user_exercises` table).
 * `Exercise.id` is globally unique because user_exercises has its own UUID
 * space, so a single `id` is enough to look up either side via
 * `findExerciseAnywhere`.
 */
export type ExerciseOrigin = "system" | "user";
export type Exercise = {
    id: string;
    externalId: string | null;
    slug: string;
    name: string;
    force: ExerciseForce | null;
    level: ExerciseLevel;
    mechanic: ExerciseMechanic | null;
    equipment: string | null;
    category: string;
    primaryMuscles: string[];
    secondaryMuscles: string[];
    instructions: string[];
    imageUrls: string[];
    origin: ExerciseOrigin;
    createdAt: Date;
    updatedAt: Date;
};
export type ExerciseListQuery = {
    muscle?: string;
    equipment?: string;
    level?: ExerciseLevel;
    mechanic?: ExerciseMechanic;
    category?: string;
    q?: string;
    limit?: number;
    offset?: number;
};
export type ExerciseListResult = {
    items: Exercise[];
    total: number;
};
//# sourceMappingURL=exercises.types.d.ts.map