import type { WorkoutPlan } from "../workout.types.js";
export declare function getActivePlan(userId: string): Promise<WorkoutPlan | null>;
export declare function regeneratePlanForUser(userId: string): Promise<WorkoutPlan>;
export declare function getTodayForUser(userId: string): Promise<{
    plan: WorkoutPlan;
    todayDayIndex: number;
} | null>;
//# sourceMappingURL=workout.service.d.ts.map