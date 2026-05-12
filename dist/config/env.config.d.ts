import * as z from "zod";
declare const envSchema: z.ZodObject<{
    GYM_POSTGRES_URI: z.ZodString;
    GYM_JWT_SECRET: z.ZodString;
    GYM_ENVIRONMENT: z.ZodEnum<{
        development: "development";
        production: "production";
        test: "test";
    }>;
    FRONTEND_URL: z.ZodDefault<z.ZodURL>;
    PORT: z.ZodCoercedNumber<unknown>;
    RESEND_API_KEY: z.ZodOptional<z.ZodString>;
    EMAIL_FROM: z.ZodDefault<z.ZodString>;
    GROQ_API_KEY: z.ZodOptional<z.ZodString>;
    GROQ_MODEL: z.ZodDefault<z.ZodString>;
    GROQ_VISION_MODEL: z.ZodDefault<z.ZodString>;
    GROQ_BASE_URL: z.ZodDefault<z.ZodURL>;
    GOOGLE_CLIENT_ID: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type ENVType = z.infer<typeof envSchema>;
export declare const ENV: {
    GYM_POSTGRES_URI: string;
    GYM_JWT_SECRET: string;
    GYM_ENVIRONMENT: "development" | "production" | "test";
    FRONTEND_URL: string;
    PORT: number;
    EMAIL_FROM: string;
    GROQ_MODEL: string;
    GROQ_VISION_MODEL: string;
    GROQ_BASE_URL: string;
    RESEND_API_KEY?: string | undefined;
    GROQ_API_KEY?: string | undefined;
    GOOGLE_CLIENT_ID?: string | undefined;
};
export {};
//# sourceMappingURL=env.config.d.ts.map