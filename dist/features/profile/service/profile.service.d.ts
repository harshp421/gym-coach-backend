import type { Profile, BodyMetric } from "../profile.types.js";
import type { BodyMetricInput, CompleteOnboardingInput, UpdateProfileInput } from "../profile.schemas.js";
export declare function getOrCreateProfile(userId: string): Promise<Profile>;
export declare function updateProfile(userId: string, input: UpdateProfileInput): Promise<Profile>;
export declare function completeOnboarding(userId: string, input: CompleteOnboardingInput): Promise<{
    profile: Profile;
    bodyMetric: BodyMetric;
}>;
export declare function listBodyMetrics(userId: string, opts: {
    limit: number;
    before?: string;
}): Promise<BodyMetric[]>;
export declare function upsertBodyMetric(userId: string, input: BodyMetricInput): Promise<BodyMetric>;
//# sourceMappingURL=profile.service.d.ts.map