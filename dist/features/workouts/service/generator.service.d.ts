import type { Exercise } from "../../exercises/exercises.types.js";
import type { GeneratedPlan } from "../workout.types.js";
type GeneratorProfile = {
    experienceLevel: "beginner" | "intermediate" | "advanced";
    trainingDaysPerWeek: number;
    equipmentAccess: "full_gym" | "home_basic" | "dumbbells_only" | "bodyweight";
    goal: "cut" | "maintain" | "bulk" | "recomp";
};
export declare const EQUIPMENT_ALLOWED: Record<GeneratorProfile["equipmentAccess"], string[]>;
export declare const LEVEL_ALLOWED: Record<GeneratorProfile["experienceLevel"], string[]>;
export declare function generatePlan(profile: GeneratorProfile, pool: Exercise[]): GeneratedPlan;
export {};
//# sourceMappingURL=generator.service.d.ts.map