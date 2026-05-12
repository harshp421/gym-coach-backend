import { z } from "zod";
export declare const createSessionSchema: z.ZodObject<{
    planDayId: z.ZodUUID;
}, z.core.$strip>;
export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export declare const completeSessionSchema: z.ZodObject<{
    notes: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type CompleteSessionInput = z.infer<typeof completeSessionSchema>;
export declare const logSetSchema: z.ZodObject<{
    planExerciseId: z.ZodUUID;
    setNumber: z.ZodNumber;
    weightKg: z.ZodOptional<z.ZodNumber>;
    reps: z.ZodNumber;
    rpe: z.ZodOptional<z.ZodNumber>;
    notes: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type LogSetInput = z.infer<typeof logSetSchema>;
//# sourceMappingURL=sessions.schemas.d.ts.map