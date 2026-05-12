import { z } from "zod";
export declare const createUserExerciseSchema: z.ZodObject<{
    name: z.ZodString;
    primaryMuscles: z.ZodArray<z.ZodString>;
    secondaryMuscles: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString>>>;
    equipment: z.ZodOptional<z.ZodString>;
    mechanic: z.ZodOptional<z.ZodNullable<z.ZodEnum<{
        compound: "compound";
        isolation: "isolation";
    }>>>;
    level: z.ZodDefault<z.ZodEnum<{
        beginner: "beginner";
        intermediate: "intermediate";
        advanced: "advanced";
    }>>;
    instructions: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString>>>;
    demoUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export type CreateUserExerciseInput = z.infer<typeof createUserExerciseSchema>;
export declare const updateUserExerciseSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    primaryMuscles: z.ZodOptional<z.ZodArray<z.ZodString>>;
    secondaryMuscles: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString>>>;
    equipment: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    mechanic: z.ZodOptional<z.ZodNullable<z.ZodEnum<{
        compound: "compound";
        isolation: "isolation";
    }>>>;
    level: z.ZodOptional<z.ZodEnum<{
        beginner: "beginner";
        intermediate: "intermediate";
        advanced: "advanced";
    }>>;
    instructions: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString>>>;
    demoUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export type UpdateUserExerciseInput = z.infer<typeof updateUserExerciseSchema>;
//# sourceMappingURL=user-exercises.schemas.d.ts.map