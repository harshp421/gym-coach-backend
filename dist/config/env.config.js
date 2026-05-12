import * as z from "zod";
import dotenv from "dotenv";
dotenv.config();
const envSchema = z.object({
    GYM_POSTGRES_URI: z.string(),
    GYM_JWT_SECRET: z.string().min(8),
    GYM_ENVIRONMENT: z.enum(["development", "production", "test"]),
    FRONTEND_URL: z.url().default("http://localhost:5173"),
    PORT: z.coerce.number(),
    // Email — both optional so dev runs without setup.
    // No RESEND_API_KEY → sender falls back to console.log.
    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().default("onboarding@resend.dev"),
    // AI coach (Groq). Optional in dev; missing key → coach endpoints return
    // 503 "coach_not_configured" and the frontend shows an empty state.
    GROQ_API_KEY: z.string().optional(),
    GROQ_MODEL: z.string().default("llama-3.3-70b-versatile"),
    // Multimodal model used when the user attaches an image (e.g. a photo
    // of a gym machine). Llama-4 Scout is vision-capable on Groq and cheap.
    GROQ_VISION_MODEL: z
        .string()
        .default("meta-llama/llama-4-scout-17b-16e-instruct"),
    GROQ_BASE_URL: z.url().default("https://api.groq.com/openai/v1"),
    // OAuth — optional in dev. Missing key → /auth/oauth returns 501.
    GOOGLE_CLIENT_ID: z.string().optional(),
});
const result = envSchema.safeParse(process.env);
if (!result.success) {
    result.error.issues.forEach((issue) => {
        console.error(issue.message);
    });
    process.exit(1);
}
export const ENV = result.data;
//# sourceMappingURL=env.config.js.map