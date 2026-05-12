import type { WorkoutPlan } from "../workout.types.js";
import type { CreateDayInput, CreateEmptyPlanInput, CreateExerciseInput, ReorderDaysInput, ReorderExercisesInput, UpdateDayInput, UpdateExerciseInput, UpdatePlanInput } from "../plan-edit.schemas.js";
export declare function updatePlan(userId: string, input: UpdatePlanInput): Promise<WorkoutPlan>;
/**
 * Archive existing active plan, create a new empty one. Days_per_week
 * snapshot from current profile. The user fills in days/exercises after.
 */
export declare function createEmptyPlan(userId: string, input: CreateEmptyPlanInput): Promise<WorkoutPlan>;
/** Archive the active plan; user lands in "no plan" state. */
export declare function deletePlan(userId: string): Promise<void>;
export declare function createDay(userId: string, input: CreateDayInput): Promise<WorkoutPlan>;
export declare function updateDay(userId: string, dayId: string, input: UpdateDayInput): Promise<WorkoutPlan>;
export declare function deleteDay(userId: string, dayId: string): Promise<WorkoutPlan>;
export declare function reorderDays(userId: string, input: ReorderDaysInput): Promise<WorkoutPlan>;
export declare function createExercise(userId: string, dayId: string, input: CreateExerciseInput): Promise<WorkoutPlan>;
/**
 * Partial update — used for both swap (`{ exerciseId }`) and edits
 * (`{ targetSets, ... }`). Auto-flip is skipped for pure swaps to keep
 * parity with the previous `swap` behavior; any non-exerciseId field
 * triggers the flip.
 */
export declare function updateExercise(userId: string, planExerciseId: string, input: UpdateExerciseInput): Promise<WorkoutPlan>;
export declare function deleteExercise(userId: string, planExerciseId: string): Promise<WorkoutPlan>;
export declare function reorderExercises(userId: string, dayId: string, input: ReorderExercisesInput): Promise<WorkoutPlan>;
//# sourceMappingURL=plan-edit.service.d.ts.map