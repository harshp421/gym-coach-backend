export type Sex = "male" | "female" | "other";
export type Goal = "cut" | "maintain" | "bulk" | "recomp";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type ExperienceLevel = "beginner" | "intermediate" | "advanced";
export type EquipmentAccess = "full_gym" | "home_basic" | "dumbbells_only" | "bodyweight";
export type DietType = "omnivore" | "vegetarian" | "vegan" | "keto" | "paleo" | "other";
export type Units = "metric" | "imperial";
export type Profile = {
    userId: string;
    dateOfBirth: string | null;
    sex: Sex | null;
    heightCm: number | null;
    goal: Goal | null;
    targetWeightKg: number | null;
    activityLevel: ActivityLevel | null;
    experienceLevel: ExperienceLevel | null;
    trainingDaysPerWeek: number | null;
    equipmentAccess: EquipmentAccess | null;
    dietType: DietType | null;
    allergies: string[];
    dislikes: string[];
    timezone: string | null;
    units: Units;
    onboardingCompletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
};
export type BodyMetric = {
    id: string;
    userId: string;
    recordedAt: string;
    weightKg: number | null;
    bodyFatPct: number | null;
    waistCm: number | null;
    notes: string | null;
    createdAt: Date;
};
//# sourceMappingURL=profile.types.d.ts.map