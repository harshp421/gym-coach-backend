/**
 * Hand-written OpenAPI 3.0 spec covering every endpoint mounted in app.ts.
 * Kept as a TS object so the type checker catches typos. When routes
 * change, edit this file in the same commit — drift is the enemy.
 *
 * Served at GET /docs by swagger-ui-express. The raw JSON is available at
 * GET /docs.json for tooling.
 */
export declare const openapiSpec: {
    readonly openapi: "3.0.3";
    readonly info: {
        readonly title: "Gym Coach API";
        readonly description: "AI-assisted gym companion. Auth uses an httpOnly cookie set by `/auth/login`; every protected route reads it.";
        readonly version: "0.1.0";
    };
    readonly servers: readonly [{
        readonly url: "/api/v1";
        readonly description: "v1";
    }];
    readonly tags: readonly [{
        readonly name: "auth";
        readonly description: "Sign-in, register, password reset, OAuth";
    }, {
        readonly name: "profile";
        readonly description: "User profile + onboarding";
    }, {
        readonly name: "body metrics";
        readonly description: "Weight / body-fat / waist log";
    }, {
        readonly name: "exercises";
        readonly description: "Catalog (system + user-owned)";
    }, {
        readonly name: "user-exercises";
        readonly description: "User-authored exercises";
    }, {
        readonly name: "workouts";
        readonly description: "Plan + today's day";
    }, {
        readonly name: "plan-edit";
        readonly description: "Mutations on the active plan (gates on no in-progress session)";
    }, {
        readonly name: "sessions";
        readonly description: "Workout sessions + set logs + history";
    }, {
        readonly name: "coach";
        readonly description: "AI chat (Groq, streaming SSE)";
    }];
    readonly components: {
        readonly securitySchemes: {
            readonly cookieAuth: {
                readonly type: "apiKey";
                readonly in: "cookie";
                readonly name: "gc_session";
                readonly description: "JWT issued on login; httpOnly, 7-day TTL.";
            };
        };
        readonly schemas: {
            readonly Error: {
                readonly type: "object";
                readonly properties: {
                    readonly error: {
                        readonly type: "string";
                        readonly example: "Unauthorized";
                    };
                };
            };
            readonly User: {
                readonly type: "object";
                readonly properties: {
                    readonly id: {
                        readonly type: "string";
                        readonly format: "uuid";
                    };
                    readonly email: {
                        readonly type: "string";
                        readonly format: "email";
                    };
                    readonly name: {
                        readonly type: "string";
                        readonly nullable: true;
                    };
                    readonly avatarUrl: {
                        readonly type: "string";
                        readonly nullable: true;
                    };
                    readonly emailVerified: {
                        readonly type: "string";
                        readonly format: "date-time";
                        readonly nullable: true;
                    };
                    readonly createdAt: {
                        readonly type: "string";
                        readonly format: "date-time";
                    };
                    readonly updatedAt: {
                        readonly type: "string";
                        readonly format: "date-time";
                    };
                };
            };
            readonly Profile: {
                readonly type: "object";
                readonly properties: {
                    readonly userId: {
                        readonly type: "string";
                        readonly format: "uuid";
                    };
                    readonly dateOfBirth: {
                        readonly type: "string";
                        readonly format: "date";
                        readonly nullable: true;
                    };
                    readonly sex: {
                        readonly type: "string";
                        readonly enum: readonly ["male", "female", "other"];
                        readonly nullable: true;
                    };
                    readonly heightCm: {
                        readonly type: "number";
                        readonly nullable: true;
                    };
                    readonly goal: {
                        readonly type: "string";
                        readonly enum: readonly ["cut", "maintain", "bulk", "recomp"];
                        readonly nullable: true;
                    };
                    readonly targetWeightKg: {
                        readonly type: "number";
                        readonly nullable: true;
                    };
                    readonly activityLevel: {
                        readonly type: "string";
                        readonly enum: readonly ["sedentary", "light", "moderate", "active", "very_active"];
                        readonly nullable: true;
                    };
                    readonly experienceLevel: {
                        readonly type: "string";
                        readonly enum: readonly ["beginner", "intermediate", "advanced"];
                        readonly nullable: true;
                    };
                    readonly trainingDaysPerWeek: {
                        readonly type: "integer";
                        readonly nullable: true;
                    };
                    readonly equipmentAccess: {
                        readonly type: "string";
                        readonly enum: readonly ["full_gym", "home_basic", "dumbbells_only", "bodyweight"];
                        readonly nullable: true;
                    };
                    readonly dietType: {
                        readonly type: "string";
                        readonly enum: readonly ["omnivore", "vegetarian", "vegan", "keto", "paleo", "other"];
                        readonly nullable: true;
                    };
                    readonly allergies: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "string";
                        };
                    };
                    readonly dislikes: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "string";
                        };
                    };
                    readonly timezone: {
                        readonly type: "string";
                        readonly nullable: true;
                    };
                    readonly units: {
                        readonly type: "string";
                        readonly enum: readonly ["metric", "imperial"];
                    };
                    readonly onboardingCompletedAt: {
                        readonly type: "string";
                        readonly format: "date-time";
                        readonly nullable: true;
                    };
                };
            };
            readonly BodyMetric: {
                readonly type: "object";
                readonly properties: {
                    readonly id: {
                        readonly type: "string";
                        readonly format: "uuid";
                    };
                    readonly userId: {
                        readonly type: "string";
                        readonly format: "uuid";
                    };
                    readonly recordedAt: {
                        readonly type: "string";
                        readonly format: "date";
                    };
                    readonly weightKg: {
                        readonly type: "number";
                        readonly nullable: true;
                    };
                    readonly bodyFatPct: {
                        readonly type: "number";
                        readonly nullable: true;
                    };
                    readonly waistCm: {
                        readonly type: "number";
                        readonly nullable: true;
                    };
                    readonly notes: {
                        readonly type: "string";
                        readonly nullable: true;
                    };
                    readonly createdAt: {
                        readonly type: "string";
                        readonly format: "date-time";
                    };
                };
            };
            readonly Exercise: {
                readonly type: "object";
                readonly properties: {
                    readonly id: {
                        readonly type: "string";
                        readonly format: "uuid";
                    };
                    readonly slug: {
                        readonly type: "string";
                    };
                    readonly name: {
                        readonly type: "string";
                    };
                    readonly level: {
                        readonly type: "string";
                        readonly enum: readonly ["beginner", "intermediate", "advanced"];
                    };
                    readonly mechanic: {
                        readonly type: "string";
                        readonly enum: readonly ["compound", "isolation"];
                        readonly nullable: true;
                    };
                    readonly equipment: {
                        readonly type: "string";
                        readonly nullable: true;
                    };
                    readonly category: {
                        readonly type: "string";
                    };
                    readonly primaryMuscles: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "string";
                        };
                    };
                    readonly secondaryMuscles: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "string";
                        };
                    };
                    readonly instructions: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "string";
                        };
                    };
                    readonly imageUrls: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "string";
                        };
                    };
                    readonly origin: {
                        readonly type: "string";
                        readonly enum: readonly ["system", "user"];
                    };
                };
            };
            readonly PlanExercise: {
                readonly type: "object";
                readonly properties: {
                    readonly id: {
                        readonly type: "string";
                        readonly format: "uuid";
                    };
                    readonly planDayId: {
                        readonly type: "string";
                        readonly format: "uuid";
                    };
                    readonly position: {
                        readonly type: "integer";
                    };
                    readonly targetSets: {
                        readonly type: "integer";
                    };
                    readonly targetRepsMin: {
                        readonly type: "integer";
                    };
                    readonly targetRepsMax: {
                        readonly type: "integer";
                    };
                    readonly targetRpe: {
                        readonly type: "number";
                        readonly nullable: true;
                    };
                    readonly restSeconds: {
                        readonly type: "integer";
                        readonly nullable: true;
                    };
                    readonly notes: {
                        readonly type: "string";
                        readonly nullable: true;
                    };
                    readonly exercise: {
                        readonly $ref: "#/components/schemas/Exercise";
                    };
                };
            };
            readonly PlanDay: {
                readonly type: "object";
                readonly properties: {
                    readonly id: {
                        readonly type: "string";
                        readonly format: "uuid";
                    };
                    readonly planId: {
                        readonly type: "string";
                        readonly format: "uuid";
                    };
                    readonly dayIndex: {
                        readonly type: "integer";
                    };
                    readonly name: {
                        readonly type: "string";
                    };
                    readonly weekdayHint: {
                        readonly type: "integer";
                        readonly minimum: 0;
                        readonly maximum: 6;
                        readonly nullable: true;
                    };
                    readonly exercises: {
                        readonly type: "array";
                        readonly items: {
                            readonly $ref: "#/components/schemas/PlanExercise";
                        };
                    };
                };
            };
            readonly WorkoutPlan: {
                readonly type: "object";
                readonly properties: {
                    readonly id: {
                        readonly type: "string";
                        readonly format: "uuid";
                    };
                    readonly userId: {
                        readonly type: "string";
                        readonly format: "uuid";
                    };
                    readonly status: {
                        readonly type: "string";
                        readonly enum: readonly ["active", "archived"];
                    };
                    readonly splitType: {
                        readonly type: "string";
                        readonly enum: readonly ["full_body", "upper_lower", "push_pull_legs", "bro_split", "custom"];
                    };
                    readonly daysPerWeek: {
                        readonly type: "integer";
                    };
                    readonly goal: {
                        readonly type: "string";
                    };
                    readonly name: {
                        readonly type: "string";
                        readonly nullable: true;
                    };
                    readonly notes: {
                        readonly type: "string";
                        readonly nullable: true;
                    };
                    readonly generatedAt: {
                        readonly type: "string";
                        readonly format: "date-time";
                    };
                    readonly days: {
                        readonly type: "array";
                        readonly items: {
                            readonly $ref: "#/components/schemas/PlanDay";
                        };
                    };
                };
            };
            readonly SetLog: {
                readonly type: "object";
                readonly properties: {
                    readonly id: {
                        readonly type: "string";
                        readonly format: "uuid";
                    };
                    readonly sessionId: {
                        readonly type: "string";
                        readonly format: "uuid";
                    };
                    readonly planExerciseId: {
                        readonly type: "string";
                        readonly format: "uuid";
                    };
                    readonly setNumber: {
                        readonly type: "integer";
                    };
                    readonly weightKg: {
                        readonly type: "number";
                        readonly nullable: true;
                    };
                    readonly reps: {
                        readonly type: "integer";
                    };
                    readonly rpe: {
                        readonly type: "number";
                        readonly nullable: true;
                    };
                    readonly notes: {
                        readonly type: "string";
                        readonly nullable: true;
                    };
                    readonly loggedAt: {
                        readonly type: "string";
                        readonly format: "date-time";
                    };
                };
            };
            readonly WorkoutSession: {
                readonly type: "object";
                readonly properties: {
                    readonly id: {
                        readonly type: "string";
                        readonly format: "uuid";
                    };
                    readonly userId: {
                        readonly type: "string";
                        readonly format: "uuid";
                    };
                    readonly planId: {
                        readonly type: "string";
                        readonly format: "uuid";
                    };
                    readonly planDayId: {
                        readonly type: "string";
                        readonly format: "uuid";
                    };
                    readonly startedAt: {
                        readonly type: "string";
                        readonly format: "date-time";
                    };
                    readonly completedAt: {
                        readonly type: "string";
                        readonly format: "date-time";
                        readonly nullable: true;
                    };
                    readonly notes: {
                        readonly type: "string";
                        readonly nullable: true;
                    };
                };
            };
            readonly ChatMessage: {
                readonly type: "object";
                readonly properties: {
                    readonly id: {
                        readonly type: "string";
                        readonly format: "uuid";
                    };
                    readonly sessionId: {
                        readonly type: "string";
                        readonly format: "uuid";
                    };
                    readonly role: {
                        readonly type: "string";
                        readonly enum: readonly ["user", "assistant", "system"];
                    };
                    readonly content: {
                        readonly type: "string";
                    };
                    readonly createdAt: {
                        readonly type: "string";
                        readonly format: "date-time";
                    };
                };
            };
            readonly UserExercise: {
                readonly type: "object";
                readonly properties: {
                    readonly id: {
                        readonly type: "string";
                        readonly format: "uuid";
                    };
                    readonly userId: {
                        readonly type: "string";
                        readonly format: "uuid";
                    };
                    readonly name: {
                        readonly type: "string";
                    };
                    readonly slug: {
                        readonly type: "string";
                    };
                    readonly primaryMuscles: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "string";
                        };
                    };
                    readonly secondaryMuscles: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "string";
                        };
                    };
                    readonly equipment: {
                        readonly type: "string";
                        readonly nullable: true;
                    };
                    readonly mechanic: {
                        readonly type: "string";
                        readonly enum: readonly ["compound", "isolation"];
                        readonly nullable: true;
                    };
                    readonly level: {
                        readonly type: "string";
                        readonly enum: readonly ["beginner", "intermediate", "advanced"];
                    };
                    readonly instructions: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "string";
                        };
                    };
                    readonly demoUrl: {
                        readonly type: "string";
                        readonly nullable: true;
                    };
                    readonly archivedAt: {
                        readonly type: "string";
                        readonly format: "date-time";
                        readonly nullable: true;
                    };
                };
            };
        };
    };
    readonly paths: {
        readonly "/auth/register": {
            readonly post: {
                readonly tags: readonly ["auth"];
                readonly summary: "Register a user";
                readonly requestBody: {
                    readonly required: true;
                    readonly content: {
                        readonly "application/json": {
                            readonly schema: {
                                readonly type: "object";
                                readonly required: readonly ["name", "email", "password"];
                                readonly properties: {
                                    readonly name: {
                                        readonly type: "string";
                                        readonly minLength: 3;
                                    };
                                    readonly email: {
                                        readonly type: "string";
                                        readonly format: "email";
                                    };
                                    readonly password: {
                                        readonly type: "string";
                                        readonly minLength: 8;
                                    };
                                };
                            };
                        };
                    };
                };
                readonly responses: {
                    readonly "201": {
                        readonly description: "User created (cookie set)";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly user: {
                                            readonly $ref: "#/components/schemas/User";
                                        };
                                    };
                                };
                            };
                        };
                    };
                    readonly "400": {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    type: string;
                                    properties: {
                                        error: {
                                            type: string;
                                            example: string;
                                        };
                                        fields: {
                                            type: string;
                                            additionalProperties: {
                                                type: string;
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                    readonly "409": {
                        readonly description: "Email already registered";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/Error";
                                };
                            };
                        };
                    };
                };
            };
        };
        readonly "/auth/login": {
            readonly post: {
                readonly tags: readonly ["auth"];
                readonly summary: "Sign in";
                readonly requestBody: {
                    readonly required: true;
                    readonly content: {
                        readonly "application/json": {
                            readonly schema: {
                                readonly type: "object";
                                readonly required: readonly ["email", "password"];
                                readonly properties: {
                                    readonly email: {
                                        readonly type: "string";
                                        readonly format: "email";
                                    };
                                    readonly password: {
                                        readonly type: "string";
                                    };
                                };
                            };
                        };
                    };
                };
                readonly responses: {
                    readonly "200": {
                        readonly description: "Signed in (cookie set)";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly user: {
                                            readonly $ref: "#/components/schemas/User";
                                        };
                                    };
                                };
                            };
                        };
                    };
                    readonly "400": {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    type: string;
                                    properties: {
                                        error: {
                                            type: string;
                                            example: string;
                                        };
                                        fields: {
                                            type: string;
                                            additionalProperties: {
                                                type: string;
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                    readonly "401": {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        readonly "/auth/logout": {
            readonly post: {
                readonly tags: readonly ["auth"];
                readonly summary: "Sign out";
                readonly responses: {
                    readonly "200": {
                        readonly description: "Cookie cleared";
                    };
                };
            };
        };
        readonly "/auth/me": {
            readonly get: {
                readonly tags: readonly ["auth"];
                readonly summary: "Current user";
                readonly security: readonly [{
                    cookieAuth: string[];
                }];
                readonly responses: {
                    readonly "200": {
                        readonly description: "Current user";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly user: {
                                            readonly $ref: "#/components/schemas/User";
                                        };
                                    };
                                };
                            };
                        };
                    };
                    readonly "401": {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        readonly "/auth/forgot-password": {
            readonly post: {
                readonly tags: readonly ["auth"];
                readonly summary: "Request password reset";
                readonly requestBody: {
                    readonly required: true;
                    readonly content: {
                        readonly "application/json": {
                            readonly schema: {
                                readonly type: "object";
                                readonly required: readonly ["email"];
                                readonly properties: {
                                    readonly email: {
                                        readonly type: "string";
                                        readonly format: "email";
                                    };
                                };
                            };
                        };
                    };
                };
                readonly responses: {
                    readonly "200": {
                        readonly description: "Always returns ok (doesn't leak whether email exists)";
                    };
                };
            };
        };
        readonly "/auth/reset-password": {
            readonly post: {
                readonly tags: readonly ["auth"];
                readonly summary: "Complete password reset";
                readonly requestBody: {
                    readonly required: true;
                    readonly content: {
                        readonly "application/json": {
                            readonly schema: {
                                readonly type: "object";
                                readonly required: readonly ["token", "password"];
                                readonly properties: {
                                    readonly token: {
                                        readonly type: "string";
                                    };
                                    readonly password: {
                                        readonly type: "string";
                                        readonly minLength: 8;
                                    };
                                };
                            };
                        };
                    };
                };
                readonly responses: {
                    readonly "200": {
                        readonly description: "Password updated";
                    };
                    readonly "400": {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    type: string;
                                    properties: {
                                        error: {
                                            type: string;
                                            example: string;
                                        };
                                        fields: {
                                            type: string;
                                            additionalProperties: {
                                                type: string;
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
        };
        readonly "/auth/verify-email": {
            readonly post: {
                readonly tags: readonly ["auth"];
                readonly summary: "Verify email via the link token";
                readonly requestBody: {
                    readonly required: true;
                    readonly content: {
                        readonly "application/json": {
                            readonly schema: {
                                readonly type: "object";
                                readonly required: readonly ["token"];
                                readonly properties: {
                                    readonly token: {
                                        readonly type: "string";
                                    };
                                };
                            };
                        };
                    };
                };
                readonly responses: {
                    readonly "200": {
                        readonly description: "Verified";
                    };
                };
            };
        };
        readonly "/auth/resend-verification": {
            readonly post: {
                readonly tags: readonly ["auth"];
                readonly summary: "Resend the verification email";
                readonly security: readonly [{
                    cookieAuth: string[];
                }];
                readonly responses: {
                    readonly "200": {
                        readonly description: "Queued";
                    };
                    readonly "401": {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        readonly "/auth/oauth": {
            readonly post: {
                readonly tags: readonly ["auth"];
                readonly summary: "OAuth sign-in (Google / Apple)";
                readonly requestBody: {
                    readonly required: true;
                    readonly content: {
                        readonly "application/json": {
                            readonly schema: {
                                readonly type: "object";
                                readonly required: readonly ["provider", "idToken"];
                                readonly properties: {
                                    readonly provider: {
                                        readonly type: "string";
                                        readonly enum: readonly ["google", "apple"];
                                    };
                                    readonly idToken: {
                                        readonly type: "string";
                                    };
                                };
                            };
                        };
                    };
                };
                readonly responses: {
                    readonly "200": {
                        readonly description: "Signed in (cookie set)";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly user: {
                                            readonly $ref: "#/components/schemas/User";
                                        };
                                    };
                                };
                            };
                        };
                    };
                    readonly "501": {
                        readonly description: "Provider verification not implemented";
                    };
                };
            };
        };
        readonly "/profile": {
            readonly get: {
                readonly tags: readonly ["profile"];
                readonly summary: "Get profile + onboarding status";
                readonly security: readonly [{
                    cookieAuth: string[];
                }];
                readonly responses: {
                    readonly "200": {
                        readonly description: "Profile (auto-created on first access)";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly profile: {
                                            readonly $ref: "#/components/schemas/Profile";
                                        };
                                        readonly completedOnboarding: {
                                            readonly type: "boolean";
                                        };
                                    };
                                };
                            };
                        };
                    };
                    readonly "401": {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
            readonly put: {
                readonly tags: readonly ["profile"];
                readonly summary: "Partial profile update";
                readonly security: readonly [{
                    cookieAuth: string[];
                }];
                readonly requestBody: {
                    readonly required: true;
                    readonly content: {
                        readonly "application/json": {
                            readonly schema: {
                                readonly $ref: "#/components/schemas/Profile";
                            };
                        };
                    };
                };
                readonly responses: {
                    readonly "200": {
                        readonly description: "Updated profile";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly profile: {
                                            readonly $ref: "#/components/schemas/Profile";
                                        };
                                    };
                                };
                            };
                        };
                    };
                    readonly "400": {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    type: string;
                                    properties: {
                                        error: {
                                            type: string;
                                            example: string;
                                        };
                                        fields: {
                                            type: string;
                                            additionalProperties: {
                                                type: string;
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                    readonly "401": {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        readonly "/profile/complete-onboarding": {
            readonly post: {
                readonly tags: readonly ["profile"];
                readonly summary: "Complete onboarding wizard (atomic profile + initial weight)";
                readonly security: readonly [{
                    cookieAuth: string[];
                }];
                readonly responses: {
                    readonly "201": {
                        readonly description: "Onboarding complete";
                    };
                    readonly "400": {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    type: string;
                                    properties: {
                                        error: {
                                            type: string;
                                            example: string;
                                        };
                                        fields: {
                                            type: string;
                                            additionalProperties: {
                                                type: string;
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                    readonly "401": {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        readonly "/body-metrics": {
            readonly get: {
                readonly tags: readonly ["body metrics"];
                readonly summary: "List recent body metrics";
                readonly security: readonly [{
                    cookieAuth: string[];
                }];
                readonly parameters: readonly [{
                    readonly name: "limit";
                    readonly in: "query";
                    readonly schema: {
                        readonly type: "integer";
                        readonly default: 30;
                        readonly maximum: 100;
                    };
                }, {
                    readonly name: "before";
                    readonly in: "query";
                    readonly schema: {
                        readonly type: "string";
                        readonly format: "date";
                    };
                }];
                readonly responses: {
                    readonly "200": {
                        readonly description: "Metrics, newest first";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly metrics: {
                                            readonly type: "array";
                                            readonly items: {
                                                readonly $ref: "#/components/schemas/BodyMetric";
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                    readonly "401": {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
            readonly post: {
                readonly tags: readonly ["body metrics"];
                readonly summary: "Log today's metrics (UPSERT on recorded_at)";
                readonly security: readonly [{
                    cookieAuth: string[];
                }];
                readonly requestBody: {
                    readonly required: true;
                    readonly content: {
                        readonly "application/json": {
                            readonly schema: {
                                readonly type: "object";
                                readonly description: "At least one of weight / bodyFat / waist";
                                readonly properties: {
                                    readonly recordedAt: {
                                        readonly type: "string";
                                        readonly format: "date";
                                    };
                                    readonly weightKg: {
                                        readonly type: "number";
                                        readonly nullable: true;
                                    };
                                    readonly bodyFatPct: {
                                        readonly type: "number";
                                        readonly nullable: true;
                                    };
                                    readonly waistCm: {
                                        readonly type: "number";
                                        readonly nullable: true;
                                    };
                                    readonly notes: {
                                        readonly type: "string";
                                        readonly nullable: true;
                                    };
                                };
                            };
                        };
                    };
                };
                readonly responses: {
                    readonly "201": {
                        readonly description: "Logged";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly metric: {
                                            readonly $ref: "#/components/schemas/BodyMetric";
                                        };
                                    };
                                };
                            };
                        };
                    };
                    readonly "400": {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    type: string;
                                    properties: {
                                        error: {
                                            type: string;
                                            example: string;
                                        };
                                        fields: {
                                            type: string;
                                            additionalProperties: {
                                                type: string;
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                    readonly "401": {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        readonly "/exercises": {
            readonly get: {
                readonly tags: readonly ["exercises"];
                readonly summary: "List exercises (system + user merged)";
                readonly security: readonly [{
                    cookieAuth: string[];
                }];
                readonly parameters: readonly [{
                    readonly name: "muscle";
                    readonly in: "query";
                    readonly schema: {
                        readonly type: "string";
                    };
                }, {
                    readonly name: "equipment";
                    readonly in: "query";
                    readonly schema: {
                        readonly type: "string";
                    };
                }, {
                    readonly name: "level";
                    readonly in: "query";
                    readonly schema: {
                        readonly type: "string";
                        readonly enum: readonly ["beginner", "intermediate", "advanced"];
                    };
                }, {
                    readonly name: "mechanic";
                    readonly in: "query";
                    readonly schema: {
                        readonly type: "string";
                        readonly enum: readonly ["compound", "isolation"];
                    };
                }, {
                    readonly name: "q";
                    readonly in: "query";
                    readonly schema: {
                        readonly type: "string";
                    };
                }, {
                    readonly name: "source";
                    readonly in: "query";
                    readonly schema: {
                        readonly type: "string";
                        readonly enum: readonly ["all", "system", "user"];
                        readonly default: "all";
                    };
                }, {
                    readonly name: "limit";
                    readonly in: "query";
                    readonly schema: {
                        readonly type: "integer";
                        readonly default: 30;
                    };
                }, {
                    readonly name: "offset";
                    readonly in: "query";
                    readonly schema: {
                        readonly type: "integer";
                        readonly default: 0;
                    };
                }];
                readonly responses: {
                    readonly "200": {
                        readonly description: "Filtered list";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly items: {
                                            readonly type: "array";
                                            readonly items: {
                                                readonly $ref: "#/components/schemas/Exercise";
                                            };
                                        };
                                        readonly total: {
                                            readonly type: "integer";
                                        };
                                    };
                                };
                            };
                        };
                    };
                    readonly "401": {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        readonly "/exercises/{slug}": {
            readonly get: {
                readonly tags: readonly ["exercises"];
                readonly summary: "Get system exercise by slug";
                readonly security: readonly [{
                    cookieAuth: string[];
                }];
                readonly parameters: readonly [{
                    readonly name: "slug";
                    readonly in: "path";
                    readonly required: true;
                    readonly schema: {
                        readonly type: "string";
                    };
                }];
                readonly responses: {
                    readonly "200": {
                        readonly description: "Exercise";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly exercise: {
                                            readonly $ref: "#/components/schemas/Exercise";
                                        };
                                    };
                                };
                            };
                        };
                    };
                    readonly "401": {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    readonly "404": {
                        readonly description: "Not found";
                    };
                };
            };
        };
        readonly "/user-exercises": {
            readonly get: {
                readonly tags: readonly ["user-exercises"];
                readonly summary: "List the user's custom exercises";
                readonly security: readonly [{
                    cookieAuth: string[];
                }];
                readonly parameters: readonly [{
                    readonly name: "includeArchived";
                    readonly in: "query";
                    readonly schema: {
                        readonly type: "string";
                        readonly enum: readonly ["0", "1"];
                    };
                }];
                readonly responses: {
                    readonly "200": {
                        readonly description: "List";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly items: {
                                            readonly type: "array";
                                            readonly items: {
                                                readonly $ref: "#/components/schemas/UserExercise";
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                    readonly "401": {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
            readonly post: {
                readonly tags: readonly ["user-exercises"];
                readonly summary: "Create a user-authored exercise";
                readonly security: readonly [{
                    cookieAuth: string[];
                }];
                readonly responses: {
                    readonly "201": {
                        readonly description: "Created";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly exercise: {
                                            readonly $ref: "#/components/schemas/UserExercise";
                                        };
                                    };
                                };
                            };
                        };
                    };
                    readonly "400": {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    type: string;
                                    properties: {
                                        error: {
                                            type: string;
                                            example: string;
                                        };
                                        fields: {
                                            type: string;
                                            additionalProperties: {
                                                type: string;
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                    readonly "401": {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        readonly "/user-exercises/{id}": {
            readonly patch: {
                readonly tags: readonly ["user-exercises"];
                readonly summary: "Partial update";
                readonly security: readonly [{
                    cookieAuth: string[];
                }];
                readonly parameters: readonly [{
                    readonly name: "id";
                    readonly in: "path";
                    readonly required: true;
                    readonly schema: {
                        readonly type: "string";
                        readonly format: "uuid";
                    };
                }];
                readonly responses: {
                    readonly "200": {
                        readonly description: "Updated";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly exercise: {
                                            readonly $ref: "#/components/schemas/UserExercise";
                                        };
                                    };
                                };
                            };
                        };
                    };
                    readonly "404": {
                        readonly description: "Not found";
                    };
                };
            };
        };
        readonly "/user-exercises/{id}/archive": {
            readonly post: {
                readonly tags: readonly ["user-exercises"];
                readonly summary: "Soft-delete a custom exercise";
                readonly security: readonly [{
                    cookieAuth: string[];
                }];
                readonly parameters: readonly [{
                    readonly name: "id";
                    readonly in: "path";
                    readonly required: true;
                    readonly schema: {
                        readonly type: "string";
                        readonly format: "uuid";
                    };
                }];
                readonly responses: {
                    readonly "200": {
                        readonly description: "Archived";
                    };
                };
            };
        };
        readonly "/user-exercises/{id}/restore": {
            readonly post: {
                readonly tags: readonly ["user-exercises"];
                readonly summary: "Un-archive a custom exercise";
                readonly security: readonly [{
                    cookieAuth: string[];
                }];
                readonly parameters: readonly [{
                    readonly name: "id";
                    readonly in: "path";
                    readonly required: true;
                    readonly schema: {
                        readonly type: "string";
                        readonly format: "uuid";
                    };
                }];
                readonly responses: {
                    readonly "200": {
                        readonly description: "Restored";
                    };
                };
            };
        };
        readonly "/workouts/plan": {
            readonly get: {
                readonly tags: readonly ["workouts"];
                readonly summary: "Get the active plan";
                readonly security: readonly [{
                    cookieAuth: string[];
                }];
                readonly responses: {
                    readonly "200": {
                        readonly description: "Plan or `{ plan: null }` if none";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly plan: {
                                            readonly $ref: "#/components/schemas/WorkoutPlan";
                                            readonly nullable: true;
                                        };
                                    };
                                };
                            };
                        };
                    };
                    readonly "401": {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
            readonly patch: {
                readonly tags: readonly ["plan-edit"];
                readonly summary: "Update plan-level fields (name, notes, goal)";
                readonly security: readonly [{
                    cookieAuth: string[];
                }];
                readonly responses: {
                    readonly "200": {
                        readonly description: "Updated plan";
                    };
                    readonly "401": {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    readonly "409": {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    type: string;
                                    properties: {
                                        error: {
                                            type: string;
                                            enum: string[];
                                        };
                                        sessionId: {
                                            type: string;
                                            format: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
            readonly delete: {
                readonly tags: readonly ["plan-edit"];
                readonly summary: "Archive the active plan";
                readonly security: readonly [{
                    cookieAuth: string[];
                }];
                readonly responses: {
                    readonly "204": {
                        readonly description: "Archived";
                    };
                    readonly "401": {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    readonly "409": {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    type: string;
                                    properties: {
                                        error: {
                                            type: string;
                                            enum: string[];
                                        };
                                        sessionId: {
                                            type: string;
                                            format: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
        };
        readonly "/workouts/plan/generate": {
            readonly post: {
                readonly tags: readonly ["workouts"];
                readonly summary: "Regenerate plan from current profile";
                readonly security: readonly [{
                    cookieAuth: string[];
                }];
                readonly responses: {
                    readonly "201": {
                        readonly description: "Generated plan";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly plan: {
                                            readonly $ref: "#/components/schemas/WorkoutPlan";
                                        };
                                    };
                                };
                            };
                        };
                    };
                    readonly "400": {
                        readonly description: "Onboarding not complete";
                    };
                    readonly "401": {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        readonly "/workouts/plan/today": {
            readonly get: {
                readonly tags: readonly ["workouts"];
                readonly summary: "Today's day index (or null if no plan)";
                readonly security: readonly [{
                    cookieAuth: string[];
                }];
                readonly responses: {
                    readonly "200": {
                        readonly description: "Today";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly plan: {
                                            readonly $ref: "#/components/schemas/WorkoutPlan";
                                            readonly nullable: true;
                                        };
                                        readonly todayDayIndex: {
                                            readonly type: "integer";
                                            readonly nullable: true;
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
        };
        readonly "/workouts/plan/empty": {
            readonly post: {
                readonly tags: readonly ["plan-edit"];
                readonly summary: "Archive existing + create empty custom plan";
                readonly security: readonly [{
                    cookieAuth: string[];
                }];
                readonly responses: {
                    readonly "201": {
                        readonly description: "Empty plan";
                    };
                    readonly "401": {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    readonly "409": {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    type: string;
                                    properties: {
                                        error: {
                                            type: string;
                                            enum: string[];
                                        };
                                        sessionId: {
                                            type: string;
                                            format: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
        };
        readonly "/workouts/plan/days": {
            readonly post: {
                readonly tags: readonly ["plan-edit"];
                readonly summary: "Add a day to the plan";
                readonly security: readonly [{
                    cookieAuth: string[];
                }];
                readonly responses: {
                    readonly "201": {
                        readonly description: "Plan with new day";
                    };
                    readonly "401": {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    readonly "409": {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    type: string;
                                    properties: {
                                        error: {
                                            type: string;
                                            enum: string[];
                                        };
                                        sessionId: {
                                            type: string;
                                            format: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
        };
        readonly "/workouts/plan/days/reorder": {
            readonly post: {
                readonly tags: readonly ["plan-edit"];
                readonly summary: "Reorder days (full permutation)";
                readonly security: readonly [{
                    cookieAuth: string[];
                }];
                readonly responses: {
                    readonly "200": {
                        readonly description: "Reordered plan";
                    };
                    readonly "401": {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    readonly "409": {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    type: string;
                                    properties: {
                                        error: {
                                            type: string;
                                            enum: string[];
                                        };
                                        sessionId: {
                                            type: string;
                                            format: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
        };
        readonly "/workouts/plan/days/{dayId}": {
            readonly patch: {
                readonly tags: readonly ["plan-edit"];
                readonly summary: "Rename day / set weekday hint";
                readonly security: readonly [{
                    cookieAuth: string[];
                }];
                readonly parameters: readonly [{
                    readonly name: "dayId";
                    readonly in: "path";
                    readonly required: true;
                    readonly schema: {
                        readonly type: "string";
                        readonly format: "uuid";
                    };
                }];
                readonly responses: {
                    readonly "200": {
                        readonly description: "Updated plan";
                    };
                    readonly "401": {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    readonly "409": {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    type: string;
                                    properties: {
                                        error: {
                                            type: string;
                                            enum: string[];
                                        };
                                        sessionId: {
                                            type: string;
                                            format: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
            readonly delete: {
                readonly tags: readonly ["plan-edit"];
                readonly summary: "Delete a day (refuses if last day or has logs)";
                readonly security: readonly [{
                    cookieAuth: string[];
                }];
                readonly parameters: readonly [{
                    readonly name: "dayId";
                    readonly in: "path";
                    readonly required: true;
                    readonly schema: {
                        readonly type: "string";
                        readonly format: "uuid";
                    };
                }];
                readonly responses: {
                    readonly "200": {
                        readonly description: "Deleted; updated plan";
                    };
                    readonly "401": {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    readonly "409": {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    type: string;
                                    properties: {
                                        error: {
                                            type: string;
                                            enum: string[];
                                        };
                                        sessionId: {
                                            type: string;
                                            format: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
        };
        readonly "/workouts/plan/days/{dayId}/exercises": {
            readonly post: {
                readonly tags: readonly ["plan-edit"];
                readonly summary: "Add exercise to day (provide exerciseId OR userExerciseId)";
                readonly security: readonly [{
                    cookieAuth: string[];
                }];
                readonly parameters: readonly [{
                    readonly name: "dayId";
                    readonly in: "path";
                    readonly required: true;
                    readonly schema: {
                        readonly type: "string";
                        readonly format: "uuid";
                    };
                }];
                readonly responses: {
                    readonly "201": {
                        readonly description: "Updated plan";
                    };
                    readonly "401": {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    readonly "409": {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    type: string;
                                    properties: {
                                        error: {
                                            type: string;
                                            enum: string[];
                                        };
                                        sessionId: {
                                            type: string;
                                            format: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
        };
        readonly "/workouts/plan/days/{dayId}/exercises/reorder": {
            readonly post: {
                readonly tags: readonly ["plan-edit"];
                readonly summary: "Reorder exercises within a day";
                readonly security: readonly [{
                    cookieAuth: string[];
                }];
                readonly parameters: readonly [{
                    readonly name: "dayId";
                    readonly in: "path";
                    readonly required: true;
                    readonly schema: {
                        readonly type: "string";
                        readonly format: "uuid";
                    };
                }];
                readonly responses: {
                    readonly "200": {
                        readonly description: "Reordered";
                    };
                    readonly "401": {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    readonly "409": {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    type: string;
                                    properties: {
                                        error: {
                                            type: string;
                                            enum: string[];
                                        };
                                        sessionId: {
                                            type: string;
                                            format: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
        };
        readonly "/workouts/plan/exercises/{planExerciseId}": {
            readonly patch: {
                readonly tags: readonly ["plan-edit"];
                readonly summary: "Swap or edit a plan_exercise (partial body, accepts swap-source XOR field edits)";
                readonly security: readonly [{
                    cookieAuth: string[];
                }];
                readonly parameters: readonly [{
                    readonly name: "planExerciseId";
                    readonly in: "path";
                    readonly required: true;
                    readonly schema: {
                        readonly type: "string";
                        readonly format: "uuid";
                    };
                }];
                readonly responses: {
                    readonly "200": {
                        readonly description: "Updated plan";
                    };
                    readonly "401": {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    readonly "404": {
                        readonly description: "Plan exercise not found";
                    };
                    readonly "409": {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    type: string;
                                    properties: {
                                        error: {
                                            type: string;
                                            enum: string[];
                                        };
                                        sessionId: {
                                            type: string;
                                            format: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
            readonly delete: {
                readonly tags: readonly ["plan-edit"];
                readonly summary: "Remove a plan_exercise (refuses if has logs)";
                readonly security: readonly [{
                    cookieAuth: string[];
                }];
                readonly parameters: readonly [{
                    readonly name: "planExerciseId";
                    readonly in: "path";
                    readonly required: true;
                    readonly schema: {
                        readonly type: "string";
                        readonly format: "uuid";
                    };
                }];
                readonly responses: {
                    readonly "200": {
                        readonly description: "Updated plan";
                    };
                    readonly "401": {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    readonly "409": {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    type: string;
                                    properties: {
                                        error: {
                                            type: string;
                                            enum: string[];
                                        };
                                        sessionId: {
                                            type: string;
                                            format: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
        };
        readonly "/workouts/sessions": {
            readonly get: {
                readonly tags: readonly ["sessions"];
                readonly summary: "Recent sessions (with per-session totalSets/totalReps/totalVolumeKg)";
                readonly security: readonly [{
                    cookieAuth: string[];
                }];
                readonly parameters: readonly [{
                    readonly name: "limit";
                    readonly in: "query";
                    readonly schema: {
                        readonly type: "integer";
                        readonly default: 20;
                    };
                }, {
                    readonly name: "before";
                    readonly in: "query";
                    readonly schema: {
                        readonly type: "string";
                        readonly format: "date-time";
                    };
                }];
                readonly responses: {
                    readonly "200": {
                        readonly description: "Paginated list";
                    };
                };
            };
            readonly post: {
                readonly tags: readonly ["sessions"];
                readonly summary: "Start a session against a planDayId";
                readonly security: readonly [{
                    cookieAuth: string[];
                }];
                readonly responses: {
                    readonly "201": {
                        readonly description: "Session created";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly session: {
                                            readonly $ref: "#/components/schemas/WorkoutSession";
                                        };
                                    };
                                };
                            };
                        };
                    };
                    readonly "401": {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    readonly "409": {
                        readonly description: "Already have an in-progress session — finish or abandon first";
                    };
                };
            };
        };
        readonly "/workouts/sessions/active": {
            readonly get: {
                readonly tags: readonly ["sessions"];
                readonly summary: "In-progress session, or null";
                readonly security: readonly [{
                    cookieAuth: string[];
                }];
                readonly responses: {
                    readonly "200": {
                        readonly description: "Session or null";
                    };
                    readonly "401": {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        readonly "/workouts/sessions/{id}": {
            readonly get: {
                readonly tags: readonly ["sessions"];
                readonly summary: "Get session with set logs";
                readonly security: readonly [{
                    cookieAuth: string[];
                }];
                readonly parameters: readonly [{
                    readonly name: "id";
                    readonly in: "path";
                    readonly required: true;
                    readonly schema: {
                        readonly type: "string";
                        readonly format: "uuid";
                    };
                }];
                readonly responses: {
                    readonly "200": {
                        readonly description: "Session + sets";
                    };
                    readonly "401": {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    readonly "404": {
                        readonly description: "Not found";
                    };
                };
            };
            readonly delete: {
                readonly tags: readonly ["sessions"];
                readonly summary: "Abandon an in-progress session";
                readonly security: readonly [{
                    cookieAuth: string[];
                }];
                readonly parameters: readonly [{
                    readonly name: "id";
                    readonly in: "path";
                    readonly required: true;
                    readonly schema: {
                        readonly type: "string";
                        readonly format: "uuid";
                    };
                }];
                readonly responses: {
                    readonly "204": {
                        readonly description: "Abandoned";
                    };
                };
            };
        };
        readonly "/workouts/sessions/{id}/complete": {
            readonly patch: {
                readonly tags: readonly ["sessions"];
                readonly summary: "Mark session complete (idempotent — refuses if already done)";
                readonly security: readonly [{
                    cookieAuth: string[];
                }];
                readonly parameters: readonly [{
                    readonly name: "id";
                    readonly in: "path";
                    readonly required: true;
                    readonly schema: {
                        readonly type: "string";
                        readonly format: "uuid";
                    };
                }];
                readonly responses: {
                    readonly "200": {
                        readonly description: "Completed";
                    };
                    readonly "409": {
                        readonly description: "Already complete";
                    };
                };
            };
        };
        readonly "/workouts/sessions/{id}/sets": {
            readonly post: {
                readonly tags: readonly ["sessions"];
                readonly summary: "UPSERT a set log on (sessionId, planExerciseId, setNumber)";
                readonly security: readonly [{
                    cookieAuth: string[];
                }];
                readonly parameters: readonly [{
                    readonly name: "id";
                    readonly in: "path";
                    readonly required: true;
                    readonly schema: {
                        readonly type: "string";
                        readonly format: "uuid";
                    };
                }];
                readonly responses: {
                    readonly "201": {
                        readonly description: "Logged";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly setLog: {
                                            readonly $ref: "#/components/schemas/SetLog";
                                        };
                                    };
                                };
                            };
                        };
                    };
                    readonly "409": {
                        readonly description: "Session is complete";
                    };
                };
            };
        };
        readonly "/workouts/sessions/{id}/sets/{setLogId}": {
            readonly delete: {
                readonly tags: readonly ["sessions"];
                readonly summary: "Remove a set log";
                readonly security: readonly [{
                    cookieAuth: string[];
                }];
                readonly parameters: readonly [{
                    readonly name: "id";
                    readonly in: "path";
                    readonly required: true;
                    readonly schema: {
                        readonly type: "string";
                        readonly format: "uuid";
                    };
                }, {
                    readonly name: "setLogId";
                    readonly in: "path";
                    readonly required: true;
                    readonly schema: {
                        readonly type: "string";
                        readonly format: "uuid";
                    };
                }];
                readonly responses: {
                    readonly "204": {
                        readonly description: "Deleted";
                    };
                };
            };
        };
        readonly "/workouts/exercises/{planExerciseId}/history": {
            readonly get: {
                readonly tags: readonly ["sessions"];
                readonly summary: "Per-exercise history (cross-plan; includes Epley-based isPr flags)";
                readonly security: readonly [{
                    cookieAuth: string[];
                }];
                readonly parameters: readonly [{
                    readonly name: "planExerciseId";
                    readonly in: "path";
                    readonly required: true;
                    readonly schema: {
                        readonly type: "string";
                        readonly format: "uuid";
                    };
                }, {
                    readonly name: "limit";
                    readonly in: "query";
                    readonly schema: {
                        readonly type: "integer";
                        readonly default: 10;
                    };
                }];
                readonly responses: {
                    readonly "200": {
                        readonly description: "History";
                    };
                };
            };
        };
        readonly "/coach/messages": {
            readonly get: {
                readonly tags: readonly ["coach"];
                readonly summary: "Recent chat messages (oldest first)";
                readonly security: readonly [{
                    cookieAuth: string[];
                }];
                readonly parameters: readonly [{
                    readonly name: "limit";
                    readonly in: "query";
                    readonly schema: {
                        readonly type: "integer";
                        readonly default: 50;
                        readonly maximum: 200;
                    };
                }];
                readonly responses: {
                    readonly "200": {
                        readonly description: "Messages";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly items: {
                                            readonly type: "array";
                                            readonly items: {
                                                readonly $ref: "#/components/schemas/ChatMessage";
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                    readonly "401": {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
            readonly post: {
                readonly tags: readonly ["coach"];
                readonly summary: "Send a message — streams assistant tokens via Server-Sent Events";
                readonly description: "Response is `text/event-stream`: sequence of `event: chunk` (`data: {text}`), then a single `event: done` (`data: {messageId}`), or `event: error`. Returns 503 with `coach_not_configured` when GROQ_API_KEY is missing.";
                readonly security: readonly [{
                    cookieAuth: string[];
                }];
                readonly requestBody: {
                    readonly required: true;
                    readonly content: {
                        readonly "application/json": {
                            readonly schema: {
                                readonly type: "object";
                                readonly required: readonly ["content"];
                                readonly properties: {
                                    readonly content: {
                                        readonly type: "string";
                                        readonly minLength: 1;
                                        readonly maxLength: 4000;
                                    };
                                };
                            };
                        };
                    };
                };
                readonly responses: {
                    readonly "200": {
                        readonly description: "SSE stream. Final assistant message is persisted server-side at end of stream.";
                        readonly content: {
                            readonly "text/event-stream": {
                                readonly schema: {
                                    readonly type: "string";
                                };
                            };
                        };
                    };
                    readonly "503": {
                        readonly description: "Coach not configured";
                    };
                };
            };
            readonly delete: {
                readonly tags: readonly ["coach"];
                readonly summary: "Clear the chat";
                readonly security: readonly [{
                    cookieAuth: string[];
                }];
                readonly responses: {
                    readonly "204": {
                        readonly description: "Cleared";
                    };
                };
            };
        };
    };
};
//# sourceMappingURL=openapi.d.ts.map