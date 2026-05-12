import { z } from "zod";
export declare const completeOnboardingSchema: z.ZodObject<{
    dateOfBirth: z.ZodString;
    sex: z.ZodEnum<{
        male: "male";
        female: "female";
        other: "other";
    }>;
    heightCm: z.ZodNumber;
    initialWeightKg: z.ZodNumber;
    goal: z.ZodEnum<{
        cut: "cut";
        maintain: "maintain";
        bulk: "bulk";
        recomp: "recomp";
    }>;
    targetWeightKg: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    activityLevel: z.ZodEnum<{
        sedentary: "sedentary";
        light: "light";
        moderate: "moderate";
        active: "active";
        very_active: "very_active";
    }>;
    experienceLevel: z.ZodEnum<{
        beginner: "beginner";
        intermediate: "intermediate";
        advanced: "advanced";
    }>;
    trainingDaysPerWeek: z.ZodNumber;
    equipmentAccess: z.ZodEnum<{
        full_gym: "full_gym";
        home_basic: "home_basic";
        dumbbells_only: "dumbbells_only";
        bodyweight: "bodyweight";
    }>;
    dietType: z.ZodEnum<{
        other: "other";
        omnivore: "omnivore";
        vegetarian: "vegetarian";
        vegan: "vegan";
        keto: "keto";
        paleo: "paleo";
    }>;
    allergies: z.ZodDefault<z.ZodArray<z.ZodString>>;
    dislikes: z.ZodDefault<z.ZodArray<z.ZodString>>;
    timezone: z.ZodString;
    units: z.ZodDefault<z.ZodEnum<{
        metric: "metric";
        imperial: "imperial";
    }>>;
}, z.core.$strip>;
export declare const updateProfileSchema: z.ZodObject<{
    dateOfBirth: z.ZodOptional<z.ZodString>;
    sex: z.ZodOptional<z.ZodEnum<{
        male: "male";
        female: "female";
        other: "other";
    }>>;
    heightCm: z.ZodOptional<z.ZodNumber>;
    goal: z.ZodOptional<z.ZodEnum<{
        cut: "cut";
        maintain: "maintain";
        bulk: "bulk";
        recomp: "recomp";
    }>>;
    activityLevel: z.ZodOptional<z.ZodEnum<{
        sedentary: "sedentary";
        light: "light";
        moderate: "moderate";
        active: "active";
        very_active: "very_active";
    }>>;
    experienceLevel: z.ZodOptional<z.ZodEnum<{
        beginner: "beginner";
        intermediate: "intermediate";
        advanced: "advanced";
    }>>;
    equipmentAccess: z.ZodOptional<z.ZodEnum<{
        full_gym: "full_gym";
        home_basic: "home_basic";
        dumbbells_only: "dumbbells_only";
        bodyweight: "bodyweight";
    }>>;
    dietType: z.ZodOptional<z.ZodEnum<{
        other: "other";
        omnivore: "omnivore";
        vegetarian: "vegetarian";
        vegan: "vegan";
        keto: "keto";
        paleo: "paleo";
    }>>;
    targetWeightKg: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
    trainingDaysPerWeek: z.ZodOptional<z.ZodNumber>;
    allergies: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString>>>;
    dislikes: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString>>>;
    timezone: z.ZodOptional<z.ZodString>;
    units: z.ZodOptional<z.ZodDefault<z.ZodEnum<{
        metric: "metric";
        imperial: "imperial";
    }>>>;
}, z.core.$strip>;
export declare const bodyMetricSchema: z.ZodObject<{
    recordedAt: z.ZodOptional<z.ZodString>;
    weightKg: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    bodyFatPct: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    waistCm: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export type CompleteOnboardingInput = z.infer<typeof completeOnboardingSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type BodyMetricInput = z.infer<typeof bodyMetricSchema>;
//# sourceMappingURL=profile.schemas.d.ts.map