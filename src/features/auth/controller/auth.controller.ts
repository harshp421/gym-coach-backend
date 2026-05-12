import type { Request, Response } from "express"
import { OAuth2Client } from "google-auth-library"
import * as authService from "../service/auth.service.js"
import type { PublicUser, User } from "../auth.types.js"
import { signJwt } from "../../../utils/jwt.js"
import { ENV } from "../../../config/env.config.js"
import { HttpError } from "../../../utils/http-error.js"
import {
    clearSessionCookie,
    setSessionCookie,
} from "../session-cookie.js"

// Express 5 auto-forwards rejected promises to the error middleware,
// so handlers don't need try/catch — throw to fail the request.

function publicUser(user: User): PublicUser {
    const { passwordHash: _omit, ...rest } = user
    return rest
}

// POST /api/auth/register
export async function register(req: Request, res: Response) {
    const { user } = await authService.registerUser(req.body)
    const token = signJwt({ sub: user.id, email: user.email })
    setSessionCookie(res, token)
    res.status(201).json({ user: publicUser(user) })
}

// POST /api/auth/login
export async function login(req: Request, res: Response) {
    const { user } = await authService.loginUser(req.body)
    const token = signJwt({ sub: user.id, email: user.email })
    setSessionCookie(res, token)
    res.json({ user: publicUser(user) })
}

// POST /api/auth/logout
export async function logout(_req: Request, res: Response) {
    clearSessionCookie(res)
    res.json({ ok: true })
}

// GET /api/auth/me
export async function me(req: Request, res: Response) {
    res.json({ user: req.user })
}

// POST /api/auth/forgot-password
//   Always returns ok to avoid email enumeration.
export async function forgotPassword(req: Request, res: Response) {
    await authService.requestPasswordReset(req.body.email)
    res.json({ ok: true })
}

// POST /api/auth/reset-password
export async function resetPassword(req: Request, res: Response) {
    await authService.resetUserPassword(req.body)
    res.json({ ok: true })
}

// POST /api/auth/verify-email
export async function verifyEmail(req: Request, res: Response) {
    await authService.verifyEmail(req.body.token)
    res.json({ ok: true })
}

// POST /api/auth/resend-verification (auth required)
export async function resendVerification(req: Request, res: Response) {
    if (!req.user) throw new HttpError(401, "Unauthorized")
    await authService.resendVerificationFor(req.user.id)
    res.json({ ok: true })
}

// POST /api/auth/oauth
export async function oauth(req: Request, res: Response) {
    const { idToken } = req.body
    const verified = await verifyGoogleIdToken(idToken)
    const { user } = await authService.loginWithProvider({
        provider: "google",
        providerAccountId: verified.providerAccountId,
        email: verified.email,
        name: verified.name,
        avatarUrl: verified.avatarUrl,
    })
    const token = signJwt({ sub: user.id, email: user.email })
    setSessionCookie(res, token)
    res.json({ user: publicUser(user) })
}

const googleClient = new OAuth2Client()

async function verifyGoogleIdToken(idToken: string): Promise<{
    providerAccountId: string
    email: string
    name?: string
    avatarUrl?: string
}> {
    if (!ENV.GOOGLE_CLIENT_ID) {
        throw new HttpError(501, "google sign-in is not configured")
    }
    const ticket = await googleClient
        .verifyIdToken({ idToken, audience: ENV.GOOGLE_CLIENT_ID })
        .catch(() => {
            throw new HttpError(401, "invalid google token")
        })
    const payload = ticket.getPayload()
    if (!payload?.sub || !payload.email) {
        throw new HttpError(401, "invalid google token")
    }
    if (payload.email_verified === false) {
        throw new HttpError(401, "google email not verified")
    }
    return {
        providerAccountId: payload.sub,
        email: payload.email,
        name: payload.name,
        avatarUrl: payload.picture,
    }
}
