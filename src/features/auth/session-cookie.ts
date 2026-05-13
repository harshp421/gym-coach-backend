import type { Response } from "express"
import { ENV } from "../../config/env.config.js"

export const COOKIE_NAME = "gc_session"
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

// Cookie attributes — set + clear must match or some browsers (Chrome with
// sameSite=none, Safari) refuse to remove on logout. Shared by auth
// controller (login/logout) and requireAuth (clears on invalid token).
//
// In production the frontend (trainer-ai.vercel.app) and backend
// (gym-coach-backend.vercel.app) are cross-site. Chrome 147 blocks plain
// third-party cookies by default, so SameSite=None;Secure alone isn't
// enough — `Partitioned` (CHIPS) opts the cookie into per-top-site
// storage so it survives the third-party cookie phaseout.
//
// `Partitioned` requires Secure + SameSite=None, which we already set in
// prod. Safari ignores the attribute (it'll fall through to SameSite=None
// behavior, which still works because Safari uses ITP not full 3p block).
export function sessionCookieOptions() {
    const isProd = ENV.GYM_ENVIRONMENT === "production"
    return {
        httpOnly: true,
        secure: isProd,
        sameSite: (isProd ? "none" : "lax") as "none" | "lax",
        partitioned: isProd,
        path: "/",
    }
}

export function setSessionCookie(res: Response, token: string) {
    res.cookie(COOKIE_NAME, token, {
        ...sessionCookieOptions(),
        maxAge: SEVEN_DAYS_MS,
    })
}

export function clearSessionCookie(res: Response) {
    res.clearCookie(COOKIE_NAME, sessionCookieOptions())
}
