import * as z from "zod";
import dotenv from "dotenv";
dotenv.config();

const envSchema = z.object({
  GYM_POSTGRES_URI: z.string(),
  // HS256 — 32+ bytes of entropy is the practical floor. `openssl rand -hex 32`.
  GYM_JWT_SECRET: z
    .string()
    .min(32, "GYM_JWT_SECRET must be at least 32 characters"),
  GYM_ENVIRONMENT: z.enum(["development", "production", "test"]),
  FRONTEND_URL: z.url(),
  PORT: z.coerce.number(),

  // Email via SMTP (nodemailer). All four optional in dev — if any are
  // missing the sender falls back to console.log so local dev never sends
  // real mail. EMAIL_FROM should usually match SMTP_USER (Gmail rewrites
  // the From: header to the authenticated address otherwise).
  //
  // Gmail: host=smtp.gmail.com, port=587 (STARTTLS), pass = an App
  // Password from https://myaccount.google.com/apppasswords (requires
  // 2-Step Verification). Personal Gmail caps at ~500 mails/day.
  SMTP_HOST: z.string(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_USER: z.string(),
  SMTP_PASS: z.string(),
  EMAIL_FROM: z.string(),

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

  // Upstash Redis (cache + distributed rate limit). Optional — missing
  // creds → cache becomes a no-op LRU and rate-limit falls back to an
  // in-process counter so single-instance dev still works.
  UPSTASH_REDIS_REST_URL: z.url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  result.error.issues.forEach((issue) => {
    console.error(issue.message);
  });
  process.exit(1);
}
export type ENVType = z.infer<typeof envSchema>;
export const ENV = result.data;
