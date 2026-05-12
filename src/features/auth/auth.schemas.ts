import { z } from "zod"

export const registerSchema = z.object({
    name: z.string().min(3, "Name must be at least 3 characters"),
    email: z.email("Enter a valid email").min(1, "Email is required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
})

export const loginSchema = z.object({
    email: z.email("Enter a valid email").min(1, "Email is required"),
    password: z.string().min(1, "Password is required"),
})

export const forgotPasswordSchema = z.object({
    email: z.email("Enter a valid email").min(1, "Email is required"),
})

export const resetPasswordSchema = z.object({
    token: z.string().min(1, "Token is required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
})

export const oauthSchema = z.object({
    provider: z.literal("google"),
    idToken: z.string().min(1, "idToken is required"),
})

export const verifyEmailSchema = z.object({
    token: z.string().min(1, "Token is required"),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type OauthInput = z.infer<typeof oauthSchema>
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>
