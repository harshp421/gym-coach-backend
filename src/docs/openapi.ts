/**
 * Hand-written OpenAPI 3.0 spec covering every endpoint mounted in app.ts.
 * Kept as a TS object so the type checker catches typos. When routes
 * change, edit this file in the same commit — drift is the enemy.
 *
 * Served at GET /docs by swagger-ui-express. The raw JSON is available at
 * GET /docs.json for tooling.
 */

const cookieAuth = { cookieAuth: [] as string[] }

const schemas = {
    Error: {
        type: "object",
        properties: {
            error: { type: "string", example: "Unauthorized" },
        },
    },
    User: {
        type: "object",
        properties: {
            id: { type: "string", format: "uuid" },
            email: { type: "string", format: "email" },
            name: { type: "string", nullable: true },
            avatarUrl: { type: "string", nullable: true },
            emailVerified: { type: "string", format: "date-time", nullable: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
        },
    },
    Profile: {
        type: "object",
        properties: {
            userId: { type: "string", format: "uuid" },
            dateOfBirth: { type: "string", format: "date", nullable: true },
            sex: {
                type: "string",
                enum: ["male", "female", "other"],
                nullable: true,
            },
            heightCm: { type: "number", nullable: true },
            goal: {
                type: "string",
                enum: ["cut", "maintain", "bulk", "recomp"],
                nullable: true,
            },
            targetWeightKg: { type: "number", nullable: true },
            activityLevel: {
                type: "string",
                enum: [
                    "sedentary",
                    "light",
                    "moderate",
                    "active",
                    "very_active",
                ],
                nullable: true,
            },
            experienceLevel: {
                type: "string",
                enum: ["beginner", "intermediate", "advanced"],
                nullable: true,
            },
            trainingDaysPerWeek: { type: "integer", nullable: true },
            equipmentAccess: {
                type: "string",
                enum: [
                    "full_gym",
                    "home_basic",
                    "dumbbells_only",
                    "bodyweight",
                ],
                nullable: true,
            },
            dietType: {
                type: "string",
                enum: [
                    "omnivore",
                    "vegetarian",
                    "vegan",
                    "keto",
                    "paleo",
                    "other",
                ],
                nullable: true,
            },
            allergies: { type: "array", items: { type: "string" } },
            dislikes: { type: "array", items: { type: "string" } },
            timezone: { type: "string", nullable: true },
            units: { type: "string", enum: ["metric", "imperial"] },
            onboardingCompletedAt: {
                type: "string",
                format: "date-time",
                nullable: true,
            },
        },
    },
    BodyMetric: {
        type: "object",
        properties: {
            id: { type: "string", format: "uuid" },
            userId: { type: "string", format: "uuid" },
            recordedAt: { type: "string", format: "date" },
            weightKg: { type: "number", nullable: true },
            bodyFatPct: { type: "number", nullable: true },
            waistCm: { type: "number", nullable: true },
            notes: { type: "string", nullable: true },
            createdAt: { type: "string", format: "date-time" },
        },
    },
    Exercise: {
        type: "object",
        properties: {
            id: { type: "string", format: "uuid" },
            slug: { type: "string" },
            name: { type: "string" },
            level: {
                type: "string",
                enum: ["beginner", "intermediate", "advanced"],
            },
            mechanic: {
                type: "string",
                enum: ["compound", "isolation"],
                nullable: true,
            },
            equipment: { type: "string", nullable: true },
            category: { type: "string" },
            primaryMuscles: { type: "array", items: { type: "string" } },
            secondaryMuscles: { type: "array", items: { type: "string" } },
            instructions: { type: "array", items: { type: "string" } },
            imageUrls: { type: "array", items: { type: "string" } },
            origin: { type: "string", enum: ["system", "user"] },
        },
    },
    PlanExercise: {
        type: "object",
        properties: {
            id: { type: "string", format: "uuid" },
            planDayId: { type: "string", format: "uuid" },
            position: { type: "integer" },
            targetSets: { type: "integer" },
            targetRepsMin: { type: "integer" },
            targetRepsMax: { type: "integer" },
            targetRpe: { type: "number", nullable: true },
            restSeconds: { type: "integer", nullable: true },
            notes: { type: "string", nullable: true },
            exercise: { $ref: "#/components/schemas/Exercise" },
        },
    },
    PlanDay: {
        type: "object",
        properties: {
            id: { type: "string", format: "uuid" },
            planId: { type: "string", format: "uuid" },
            dayIndex: { type: "integer" },
            name: { type: "string" },
            weekdayHint: {
                type: "integer",
                minimum: 0,
                maximum: 6,
                nullable: true,
            },
            exercises: {
                type: "array",
                items: { $ref: "#/components/schemas/PlanExercise" },
            },
        },
    },
    WorkoutPlan: {
        type: "object",
        properties: {
            id: { type: "string", format: "uuid" },
            userId: { type: "string", format: "uuid" },
            status: { type: "string", enum: ["active", "archived"] },
            splitType: {
                type: "string",
                enum: [
                    "full_body",
                    "upper_lower",
                    "push_pull_legs",
                    "bro_split",
                    "custom",
                ],
            },
            daysPerWeek: { type: "integer" },
            goal: { type: "string" },
            name: { type: "string", nullable: true },
            notes: { type: "string", nullable: true },
            generatedAt: { type: "string", format: "date-time" },
            days: {
                type: "array",
                items: { $ref: "#/components/schemas/PlanDay" },
            },
        },
    },
    SetLog: {
        type: "object",
        properties: {
            id: { type: "string", format: "uuid" },
            sessionId: { type: "string", format: "uuid" },
            planExerciseId: { type: "string", format: "uuid" },
            setNumber: { type: "integer" },
            weightKg: { type: "number", nullable: true },
            reps: { type: "integer" },
            rpe: { type: "number", nullable: true },
            notes: { type: "string", nullable: true },
            loggedAt: { type: "string", format: "date-time" },
        },
    },
    WorkoutSession: {
        type: "object",
        properties: {
            id: { type: "string", format: "uuid" },
            userId: { type: "string", format: "uuid" },
            planId: { type: "string", format: "uuid" },
            planDayId: { type: "string", format: "uuid" },
            startedAt: { type: "string", format: "date-time" },
            completedAt: {
                type: "string",
                format: "date-time",
                nullable: true,
            },
            notes: { type: "string", nullable: true },
        },
    },
    ChatMessage: {
        type: "object",
        properties: {
            id: { type: "string", format: "uuid" },
            sessionId: { type: "string", format: "uuid" },
            role: { type: "string", enum: ["user", "assistant", "system"] },
            content: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
        },
    },
    UserExercise: {
        type: "object",
        properties: {
            id: { type: "string", format: "uuid" },
            userId: { type: "string", format: "uuid" },
            name: { type: "string" },
            slug: { type: "string" },
            primaryMuscles: { type: "array", items: { type: "string" } },
            secondaryMuscles: { type: "array", items: { type: "string" } },
            equipment: { type: "string", nullable: true },
            mechanic: {
                type: "string",
                enum: ["compound", "isolation"],
                nullable: true,
            },
            level: {
                type: "string",
                enum: ["beginner", "intermediate", "advanced"],
            },
            instructions: { type: "array", items: { type: "string" } },
            demoUrl: { type: "string", nullable: true },
            archivedAt: {
                type: "string",
                format: "date-time",
                nullable: true,
            },
        },
    },
} as const

// Re-usable response objects
const auth401 = {
    description: "Unauthorized",
    content: {
        "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
        },
    },
}
const validation400 = {
    description: "Validation error",
    content: {
        "application/json": {
            schema: {
                type: "object",
                properties: {
                    error: { type: "string", example: "Invalid input" },
                    fields: {
                        type: "object",
                        additionalProperties: { type: "string" },
                    },
                },
            },
        },
    },
}
const conflict409 = {
    description: "Conflict — see error code",
    content: {
        "application/json": {
            schema: {
                type: "object",
                properties: {
                    error: {
                        type: "string",
                        enum: ["session_in_progress", "exercise_has_logs"],
                    },
                    sessionId: { type: "string", format: "uuid" },
                },
            },
        },
    },
}

export const openapiSpec = {
    openapi: "3.0.3",
    info: {
        title: "Gym Coach API",
        description:
            "AI-assisted gym companion. Auth uses an httpOnly cookie set by `/auth/login`; every protected route reads it.",
        version: "0.1.0",
    },
    servers: [{ url: "/api/v1", description: "v1" }],
    tags: [
        { name: "auth", description: "Sign-in, register, password reset, OAuth" },
        { name: "profile", description: "User profile + onboarding" },
        { name: "body metrics", description: "Weight / body-fat / waist log" },
        { name: "exercises", description: "Catalog (system + user-owned)" },
        { name: "user-exercises", description: "User-authored exercises" },
        { name: "workouts", description: "Plan + today's day" },
        {
            name: "plan-edit",
            description: "Mutations on the active plan (gates on no in-progress session)",
        },
        {
            name: "sessions",
            description: "Workout sessions + set logs + history",
        },
        { name: "coach", description: "AI chat (Groq, streaming SSE)" },
    ],
    components: {
        securitySchemes: {
            cookieAuth: {
                type: "apiKey",
                in: "cookie",
                name: "gc_session",
                description: "JWT issued on login; httpOnly, 7-day TTL.",
            },
        },
        schemas,
    },
    paths: {
        // ---------------- AUTH ----------------
        "/auth/register": {
            post: {
                tags: ["auth"],
                summary: "Register a user",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["name", "email", "password"],
                                properties: {
                                    name: { type: "string", minLength: 3 },
                                    email: { type: "string", format: "email" },
                                    password: {
                                        type: "string",
                                        minLength: 8,
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    "201": {
                        description: "User created (cookie set)",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        user: {
                                            $ref: "#/components/schemas/User",
                                        },
                                    },
                                },
                            },
                        },
                    },
                    "400": validation400,
                    "409": {
                        description: "Email already registered",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                },
            },
        },
        "/auth/login": {
            post: {
                tags: ["auth"],
                summary: "Sign in",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["email", "password"],
                                properties: {
                                    email: { type: "string", format: "email" },
                                    password: { type: "string" },
                                },
                            },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "Signed in (cookie set)",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        user: {
                                            $ref: "#/components/schemas/User",
                                        },
                                    },
                                },
                            },
                        },
                    },
                    "400": validation400,
                    "401": auth401,
                },
            },
        },
        "/auth/logout": {
            post: {
                tags: ["auth"],
                summary: "Sign out",
                responses: { "200": { description: "Cookie cleared" } },
            },
        },
        "/auth/me": {
            get: {
                tags: ["auth"],
                summary: "Current user",
                security: [cookieAuth],
                responses: {
                    "200": {
                        description: "Current user",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        user: {
                                            $ref: "#/components/schemas/User",
                                        },
                                    },
                                },
                            },
                        },
                    },
                    "401": auth401,
                },
            },
        },
        "/auth/forgot-password": {
            post: {
                tags: ["auth"],
                summary: "Request password reset",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["email"],
                                properties: {
                                    email: { type: "string", format: "email" },
                                },
                            },
                        },
                    },
                },
                responses: {
                    "200": {
                        description:
                            "Always returns ok (doesn't leak whether email exists)",
                    },
                },
            },
        },
        "/auth/reset-password": {
            post: {
                tags: ["auth"],
                summary: "Complete password reset",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["token", "password"],
                                properties: {
                                    token: { type: "string" },
                                    password: {
                                        type: "string",
                                        minLength: 8,
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    "200": { description: "Password updated" },
                    "400": validation400,
                },
            },
        },
        "/auth/verify-email": {
            post: {
                tags: ["auth"],
                summary: "Verify email via the link token",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["token"],
                                properties: { token: { type: "string" } },
                            },
                        },
                    },
                },
                responses: { "200": { description: "Verified" } },
            },
        },
        "/auth/resend-verification": {
            post: {
                tags: ["auth"],
                summary: "Resend the verification email",
                security: [cookieAuth],
                responses: { "200": { description: "Queued" }, "401": auth401 },
            },
        },
        "/auth/oauth": {
            post: {
                tags: ["auth"],
                summary: "OAuth sign-in (Google)",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["provider", "idToken"],
                                properties: {
                                    provider: {
                                        type: "string",
                                        enum: ["google"],
                                    },
                                    idToken: { type: "string" },
                                },
                            },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "Signed in (cookie set)",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        user: {
                                            $ref: "#/components/schemas/User",
                                        },
                                    },
                                },
                            },
                        },
                    },
                    "501": {
                        description: "Provider verification not implemented",
                    },
                },
            },
        },

        // ---------------- PROFILE ----------------
        "/profile": {
            get: {
                tags: ["profile"],
                summary: "Get profile + onboarding status",
                security: [cookieAuth],
                responses: {
                    "200": {
                        description: "Profile (auto-created on first access)",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        profile: {
                                            $ref: "#/components/schemas/Profile",
                                        },
                                        completedOnboarding: { type: "boolean" },
                                    },
                                },
                            },
                        },
                    },
                    "401": auth401,
                },
            },
            put: {
                tags: ["profile"],
                summary: "Partial profile update",
                security: [cookieAuth],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/Profile" },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "Updated profile",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        profile: {
                                            $ref: "#/components/schemas/Profile",
                                        },
                                    },
                                },
                            },
                        },
                    },
                    "400": validation400,
                    "401": auth401,
                },
            },
        },
        "/profile/complete-onboarding": {
            post: {
                tags: ["profile"],
                summary:
                    "Complete onboarding wizard (atomic profile + initial weight)",
                security: [cookieAuth],
                responses: {
                    "201": { description: "Onboarding complete" },
                    "400": validation400,
                    "401": auth401,
                },
            },
        },

        // ---------------- BODY METRICS ----------------
        "/body-metrics": {
            get: {
                tags: ["body metrics"],
                summary: "List recent body metrics",
                security: [cookieAuth],
                parameters: [
                    {
                        name: "limit",
                        in: "query",
                        schema: { type: "integer", default: 30, maximum: 100 },
                    },
                    {
                        name: "before",
                        in: "query",
                        schema: { type: "string", format: "date" },
                    },
                ],
                responses: {
                    "200": {
                        description: "Metrics, newest first",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        metrics: {
                                            type: "array",
                                            items: {
                                                $ref: "#/components/schemas/BodyMetric",
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    "401": auth401,
                },
            },
            post: {
                tags: ["body metrics"],
                summary: "Log today's metrics (UPSERT on recorded_at)",
                security: [cookieAuth],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                description: "At least one of weight / bodyFat / waist",
                                properties: {
                                    recordedAt: {
                                        type: "string",
                                        format: "date",
                                    },
                                    weightKg: {
                                        type: "number",
                                        nullable: true,
                                    },
                                    bodyFatPct: {
                                        type: "number",
                                        nullable: true,
                                    },
                                    waistCm: {
                                        type: "number",
                                        nullable: true,
                                    },
                                    notes: { type: "string", nullable: true },
                                },
                            },
                        },
                    },
                },
                responses: {
                    "201": {
                        description: "Logged",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        metric: {
                                            $ref: "#/components/schemas/BodyMetric",
                                        },
                                    },
                                },
                            },
                        },
                    },
                    "400": validation400,
                    "401": auth401,
                },
            },
        },

        // ---------------- EXERCISES ----------------
        "/exercises": {
            get: {
                tags: ["exercises"],
                summary: "List exercises (system + user merged)",
                security: [cookieAuth],
                parameters: [
                    { name: "muscle", in: "query", schema: { type: "string" } },
                    {
                        name: "equipment",
                        in: "query",
                        schema: { type: "string" },
                    },
                    {
                        name: "level",
                        in: "query",
                        schema: {
                            type: "string",
                            enum: [
                                "beginner",
                                "intermediate",
                                "advanced",
                            ],
                        },
                    },
                    {
                        name: "mechanic",
                        in: "query",
                        schema: {
                            type: "string",
                            enum: ["compound", "isolation"],
                        },
                    },
                    { name: "q", in: "query", schema: { type: "string" } },
                    {
                        name: "source",
                        in: "query",
                        schema: {
                            type: "string",
                            enum: ["all", "system", "user"],
                            default: "all",
                        },
                    },
                    {
                        name: "limit",
                        in: "query",
                        schema: { type: "integer", default: 30 },
                    },
                    {
                        name: "offset",
                        in: "query",
                        schema: { type: "integer", default: 0 },
                    },
                ],
                responses: {
                    "200": {
                        description: "Filtered list",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        items: {
                                            type: "array",
                                            items: {
                                                $ref: "#/components/schemas/Exercise",
                                            },
                                        },
                                        total: { type: "integer" },
                                    },
                                },
                            },
                        },
                    },
                    "401": auth401,
                },
            },
        },
        "/exercises/{slug}": {
            get: {
                tags: ["exercises"],
                summary: "Get system exercise by slug",
                security: [cookieAuth],
                parameters: [
                    {
                        name: "slug",
                        in: "path",
                        required: true,
                        schema: { type: "string" },
                    },
                ],
                responses: {
                    "200": {
                        description: "Exercise",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        exercise: {
                                            $ref: "#/components/schemas/Exercise",
                                        },
                                    },
                                },
                            },
                        },
                    },
                    "401": auth401,
                    "404": { description: "Not found" },
                },
            },
        },

        // ---------------- USER EXERCISES ----------------
        "/user-exercises": {
            get: {
                tags: ["user-exercises"],
                summary: "List the user's custom exercises",
                security: [cookieAuth],
                parameters: [
                    {
                        name: "includeArchived",
                        in: "query",
                        schema: { type: "string", enum: ["0", "1"] },
                    },
                ],
                responses: {
                    "200": {
                        description: "List",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        items: {
                                            type: "array",
                                            items: {
                                                $ref: "#/components/schemas/UserExercise",
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    "401": auth401,
                },
            },
            post: {
                tags: ["user-exercises"],
                summary: "Create a user-authored exercise",
                security: [cookieAuth],
                responses: {
                    "201": {
                        description: "Created",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        exercise: {
                                            $ref: "#/components/schemas/UserExercise",
                                        },
                                    },
                                },
                            },
                        },
                    },
                    "400": validation400,
                    "401": auth401,
                },
            },
        },
        "/user-exercises/{id}": {
            patch: {
                tags: ["user-exercises"],
                summary: "Partial update",
                security: [cookieAuth],
                parameters: [
                    {
                        name: "id",
                        in: "path",
                        required: true,
                        schema: { type: "string", format: "uuid" },
                    },
                ],
                responses: {
                    "200": {
                        description: "Updated",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        exercise: {
                                            $ref: "#/components/schemas/UserExercise",
                                        },
                                    },
                                },
                            },
                        },
                    },
                    "404": { description: "Not found" },
                },
            },
        },
        "/user-exercises/{id}/archive": {
            post: {
                tags: ["user-exercises"],
                summary: "Soft-delete a custom exercise",
                security: [cookieAuth],
                parameters: [
                    {
                        name: "id",
                        in: "path",
                        required: true,
                        schema: { type: "string", format: "uuid" },
                    },
                ],
                responses: { "200": { description: "Archived" } },
            },
        },
        "/user-exercises/{id}/restore": {
            post: {
                tags: ["user-exercises"],
                summary: "Un-archive a custom exercise",
                security: [cookieAuth],
                parameters: [
                    {
                        name: "id",
                        in: "path",
                        required: true,
                        schema: { type: "string", format: "uuid" },
                    },
                ],
                responses: { "200": { description: "Restored" } },
            },
        },

        // ---------------- WORKOUTS ----------------
        "/workouts/plan": {
            get: {
                tags: ["workouts"],
                summary: "Get the active plan",
                security: [cookieAuth],
                responses: {
                    "200": {
                        description: "Plan or `{ plan: null }` if none",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        plan: {
                                            $ref: "#/components/schemas/WorkoutPlan",
                                            nullable: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                    "401": auth401,
                },
            },
            patch: {
                tags: ["plan-edit"],
                summary: "Update plan-level fields (name, notes, goal)",
                security: [cookieAuth],
                responses: {
                    "200": { description: "Updated plan" },
                    "401": auth401,
                    "409": conflict409,
                },
            },
            delete: {
                tags: ["plan-edit"],
                summary: "Archive the active plan",
                security: [cookieAuth],
                responses: {
                    "204": { description: "Archived" },
                    "401": auth401,
                    "409": conflict409,
                },
            },
        },
        "/workouts/plan/generate": {
            post: {
                tags: ["workouts"],
                summary: "Regenerate plan from current profile",
                security: [cookieAuth],
                responses: {
                    "201": {
                        description: "Generated plan",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        plan: {
                                            $ref: "#/components/schemas/WorkoutPlan",
                                        },
                                    },
                                },
                            },
                        },
                    },
                    "400": {
                        description: "Onboarding not complete",
                    },
                    "401": auth401,
                },
            },
        },
        "/workouts/plan/today": {
            get: {
                tags: ["workouts"],
                summary: "Today's day index (or null if no plan)",
                security: [cookieAuth],
                responses: {
                    "200": {
                        description:
                            "Today's plan day, or null on a rest day / no plan.",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        day: {
                                            $ref: "#/components/schemas/PlanDay",
                                            nullable: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        "/workouts/plan/empty": {
            post: {
                tags: ["plan-edit"],
                summary: "Archive existing + create empty custom plan",
                security: [cookieAuth],
                responses: {
                    "201": { description: "Empty plan" },
                    "401": auth401,
                    "409": conflict409,
                },
            },
        },
        "/workouts/plan/days": {
            post: {
                tags: ["plan-edit"],
                summary: "Add a day to the plan",
                security: [cookieAuth],
                responses: {
                    "201": { description: "Plan with new day" },
                    "401": auth401,
                    "409": conflict409,
                },
            },
        },
        "/workouts/plan/days/reorder": {
            post: {
                tags: ["plan-edit"],
                summary: "Reorder days (full permutation)",
                security: [cookieAuth],
                responses: {
                    "200": { description: "Reordered plan" },
                    "401": auth401,
                    "409": conflict409,
                },
            },
        },
        "/workouts/plan/days/{dayId}": {
            patch: {
                tags: ["plan-edit"],
                summary: "Rename day / set weekday hint",
                security: [cookieAuth],
                parameters: [
                    {
                        name: "dayId",
                        in: "path",
                        required: true,
                        schema: { type: "string", format: "uuid" },
                    },
                ],
                responses: {
                    "200": { description: "Updated plan" },
                    "401": auth401,
                    "409": conflict409,
                },
            },
            delete: {
                tags: ["plan-edit"],
                summary: "Delete a day (refuses if last day or has logs)",
                security: [cookieAuth],
                parameters: [
                    {
                        name: "dayId",
                        in: "path",
                        required: true,
                        schema: { type: "string", format: "uuid" },
                    },
                ],
                responses: {
                    "200": { description: "Deleted; updated plan" },
                    "401": auth401,
                    "409": conflict409,
                },
            },
        },
        "/workouts/plan/days/{dayId}/exercises": {
            post: {
                tags: ["plan-edit"],
                summary:
                    "Add exercise to day (provide exerciseId OR userExerciseId)",
                security: [cookieAuth],
                parameters: [
                    {
                        name: "dayId",
                        in: "path",
                        required: true,
                        schema: { type: "string", format: "uuid" },
                    },
                ],
                responses: {
                    "201": { description: "Updated plan" },
                    "401": auth401,
                    "409": conflict409,
                },
            },
        },
        "/workouts/plan/days/{dayId}/exercises/reorder": {
            post: {
                tags: ["plan-edit"],
                summary: "Reorder exercises within a day",
                security: [cookieAuth],
                parameters: [
                    {
                        name: "dayId",
                        in: "path",
                        required: true,
                        schema: { type: "string", format: "uuid" },
                    },
                ],
                responses: {
                    "200": { description: "Reordered" },
                    "401": auth401,
                    "409": conflict409,
                },
            },
        },
        "/workouts/plan/exercises/{planExerciseId}": {
            patch: {
                tags: ["plan-edit"],
                summary:
                    "Swap or edit a plan_exercise (partial body, accepts swap-source XOR field edits)",
                security: [cookieAuth],
                parameters: [
                    {
                        name: "planExerciseId",
                        in: "path",
                        required: true,
                        schema: { type: "string", format: "uuid" },
                    },
                ],
                responses: {
                    "200": { description: "Updated plan" },
                    "401": auth401,
                    "404": { description: "Plan exercise not found" },
                    "409": conflict409,
                },
            },
            delete: {
                tags: ["plan-edit"],
                summary: "Remove a plan_exercise (refuses if has logs)",
                security: [cookieAuth],
                parameters: [
                    {
                        name: "planExerciseId",
                        in: "path",
                        required: true,
                        schema: { type: "string", format: "uuid" },
                    },
                ],
                responses: {
                    "200": { description: "Updated plan" },
                    "401": auth401,
                    "409": conflict409,
                },
            },
        },

        // ---------------- SESSIONS ----------------
        "/workouts/sessions": {
            get: {
                tags: ["sessions"],
                summary:
                    "Recent sessions (with per-session totalSets/totalReps/totalVolumeKg)",
                security: [cookieAuth],
                parameters: [
                    {
                        name: "limit",
                        in: "query",
                        schema: { type: "integer", default: 20 },
                    },
                    {
                        name: "before",
                        in: "query",
                        schema: { type: "string", format: "date-time" },
                    },
                ],
                responses: {
                    "200": {
                        description: "Paginated list",
                    },
                },
            },
            post: {
                tags: ["sessions"],
                summary: "Start a session against a planDayId",
                security: [cookieAuth],
                responses: {
                    "201": {
                        description: "Session created",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        session: {
                                            $ref: "#/components/schemas/WorkoutSession",
                                        },
                                    },
                                },
                            },
                        },
                    },
                    "401": auth401,
                    "409": {
                        description:
                            "Already have an in-progress session — finish or abandon first",
                    },
                },
            },
        },
        "/workouts/sessions/active": {
            get: {
                tags: ["sessions"],
                summary: "In-progress session, or null",
                security: [cookieAuth],
                responses: {
                    "200": { description: "Session or null" },
                    "401": auth401,
                },
            },
        },
        "/workouts/sessions/{id}": {
            get: {
                tags: ["sessions"],
                summary: "Get session with set logs",
                security: [cookieAuth],
                parameters: [
                    {
                        name: "id",
                        in: "path",
                        required: true,
                        schema: { type: "string", format: "uuid" },
                    },
                ],
                responses: {
                    "200": { description: "Session + sets" },
                    "401": auth401,
                    "404": { description: "Not found" },
                },
            },
            delete: {
                tags: ["sessions"],
                summary: "Abandon an in-progress session",
                security: [cookieAuth],
                parameters: [
                    {
                        name: "id",
                        in: "path",
                        required: true,
                        schema: { type: "string", format: "uuid" },
                    },
                ],
                responses: { "204": { description: "Abandoned" } },
            },
        },
        "/workouts/sessions/{id}/complete": {
            patch: {
                tags: ["sessions"],
                summary: "Mark session complete (idempotent — refuses if already done)",
                security: [cookieAuth],
                parameters: [
                    {
                        name: "id",
                        in: "path",
                        required: true,
                        schema: { type: "string", format: "uuid" },
                    },
                ],
                responses: {
                    "200": { description: "Completed" },
                    "409": { description: "Already complete" },
                },
            },
        },
        "/workouts/sessions/{id}/sets": {
            post: {
                tags: ["sessions"],
                summary:
                    "UPSERT a set log on (sessionId, planExerciseId, setNumber)",
                security: [cookieAuth],
                parameters: [
                    {
                        name: "id",
                        in: "path",
                        required: true,
                        schema: { type: "string", format: "uuid" },
                    },
                ],
                responses: {
                    "201": {
                        description: "Logged",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        setLog: {
                                            $ref: "#/components/schemas/SetLog",
                                        },
                                    },
                                },
                            },
                        },
                    },
                    "409": { description: "Session is complete" },
                },
            },
        },
        "/workouts/sessions/{id}/sets/{setLogId}": {
            delete: {
                tags: ["sessions"],
                summary: "Remove a set log",
                security: [cookieAuth],
                parameters: [
                    {
                        name: "id",
                        in: "path",
                        required: true,
                        schema: { type: "string", format: "uuid" },
                    },
                    {
                        name: "setLogId",
                        in: "path",
                        required: true,
                        schema: { type: "string", format: "uuid" },
                    },
                ],
                responses: { "204": { description: "Deleted" } },
            },
        },
        "/workouts/exercises/{planExerciseId}/history": {
            get: {
                tags: ["sessions"],
                summary:
                    "Per-exercise history (cross-plan; includes Epley-based isPr flags)",
                security: [cookieAuth],
                parameters: [
                    {
                        name: "planExerciseId",
                        in: "path",
                        required: true,
                        schema: { type: "string", format: "uuid" },
                    },
                    {
                        name: "limit",
                        in: "query",
                        schema: { type: "integer", default: 10 },
                    },
                ],
                responses: { "200": { description: "History" } },
            },
        },

        // ---------------- COACH ----------------
        "/coach/messages": {
            get: {
                tags: ["coach"],
                summary: "Recent chat messages (oldest first)",
                security: [cookieAuth],
                parameters: [
                    {
                        name: "limit",
                        in: "query",
                        schema: { type: "integer", default: 50, maximum: 200 },
                    },
                ],
                responses: {
                    "200": {
                        description: "Messages",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        items: {
                                            type: "array",
                                            items: {
                                                $ref: "#/components/schemas/ChatMessage",
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    "401": auth401,
                },
            },
            post: {
                tags: ["coach"],
                summary:
                    "Send a message — streams assistant tokens via Server-Sent Events",
                description:
                    "Response is `text/event-stream`: sequence of `event: chunk` (`data: {text}`), then a single `event: done` (`data: {messageId}`), or `event: error`. Returns 503 with `coach_not_configured` when GROQ_API_KEY is missing.",
                security: [cookieAuth],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["content"],
                                properties: {
                                    content: {
                                        type: "string",
                                        minLength: 1,
                                        maxLength: 4000,
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    "200": {
                        description:
                            "SSE stream. Final assistant message is persisted server-side at end of stream.",
                        content: {
                            "text/event-stream": {
                                schema: { type: "string" },
                            },
                        },
                    },
                    "503": { description: "Coach not configured" },
                },
            },
            delete: {
                tags: ["coach"],
                summary: "Clear the chat",
                security: [cookieAuth],
                responses: { "204": { description: "Cleared" } },
            },
        },
    },
} as const
