import type { Exercise } from "../exercises/exercises.types.js";
export type SplitType = "full_body" | "upper_lower" | "push_pull_legs" | "bro_split" | "custom";
export type WorkoutPlan = {
    id: string;
    userId: string;
    status: "active" | "archived";
    splitType: SplitType;
    daysPerWeek: number;
    goal: string;
    name: string | null;
    notes: string | null;
    generatedAt: Date;
    createdAt: Date;
    updatedAt: Date;
    days: PlanDay[];
};
export type PlanDay = {
    id: string;
    planId: string;
    dayIndex: number;
    name: string;
    weekdayHint: number | null;
    exercises: PlanExercise[];
};
export type PlanExercise = {
    id: string;
    planDayId: string;
    position: number;
    targetSets: number;
    targetRepsMin: number;
    targetRepsMax: number;
    targetRpe: number | null;
    restSeconds: number | null;
    notes: string | null;
    exercise: Exercise;
};
export type GeneratedPlan = {
    splitType: SplitType;
    daysPerWeek: number;
    goal: string;
    days: GeneratedDay[];
};
export type GeneratedDay = {
    dayIndex: number;
    name: string;
    weekdayHint: number | null;
    exercises: GeneratedExercise[];
};
export type GeneratedExercise = {
    exerciseId: string;
    position: number;
    targetSets: number;
    targetRepsMin: number;
    targetRepsMax: number;
    targetRpe: number | null;
    restSeconds: number | null;
};
//# sourceMappingURL=workout.types.d.ts.map