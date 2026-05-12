import { z } from "zod";
export declare const updatePlanSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    goal: z.ZodOptional<z.ZodEnum<{
        cut: "cut";
        maintain: "maintain";
        bulk: "bulk";
        recomp: "recomp";
    }>>;
}, z.core.$strip>;
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
export declare const createEmptyPlanSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type CreateEmptyPlanInput = z.infer<typeof createEmptyPlanSchema>;
export declare const createDaySchema: z.ZodObject<{
    name: z.ZodString;
    weekdayHint: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
}, z.core.$strip>;
export type CreateDayInput = z.infer<typeof createDaySchema>;
export declare const updateDaySchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    weekdayHint: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
}, z.core.$strip>;
export type UpdateDayInput = z.infer<typeof updateDaySchema>;
export declare const reorderDaysSchema: z.ZodArray<z.ZodObject<{
    dayId: z.ZodUUID;
    dayIndex: z.ZodNumber;
}, z.core.$strip>>;
export type ReorderDaysInput = z.infer<typeof reorderDaysSchema>;
export declare const createExerciseSchema: z.ZodObject<{
    exerciseId: z.ZodOptional<z.ZodUUID>;
    userExerciseId: z.ZodOptional<z.ZodUUID>;
    targetSets: z.ZodNumber;
    targetRepsMin: z.ZodNumber;
    targetRepsMax: z.ZodNumber;
    targetRpe: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    restSeconds: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export type CreateExerciseInput = z.infer<typeof createExerciseSchema>;
export declare const updateExerciseSchema: z.ZodObject<{
    exerciseId: z.ZodOptional<z.ZodUUID>;
    userExerciseId: z.ZodOptional<z.ZodUUID>;
    targetSets: z.ZodOptional<z.ZodNumber>;
    targetRepsMin: z.ZodOptional<z.ZodNumber>;
    targetRepsMax: z.ZodOptional<z.ZodNumber>;
    targetRpe: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    restSeconds: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export type UpdateExerciseInput = z.infer<typeof updateExerciseSchema>;
export declare const reorderExercisesSchema: z.ZodArray<z.ZodObject<{
    planExerciseId: z.ZodUUID;
    position: z.ZodNumber;
}, z.core.$strip>>;
export type ReorderExercisesInput = z.infer<typeof reorderExercisesSchema>;
//# sourceMappingURL=plan-edit.schemas.d.ts.map