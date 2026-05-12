import { OAuth2Client } from "google-auth-library";
import * as authService from "../service/auth.service.js";
import { signJwt } from "../../../utils/jwt.js";
import { ENV } from "../../../config/env.config.js";
import { HttpError } from "../../../utils/http-error.js";
const COOKIE_NAME = "gc_session";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
// Express 5 auto-forwards rejected promises to the error middleware,
// so handlers don't need try/catch — throw to fail the request.
function publicUser(user) {
    const { passwordHash: _omit, ...rest } = user;
    return rest;
}
// Cookie attributes — set + clear must match or some browsers
// (Chrome with sameSite=none, Safari) refuse to remove on logout.
function sessionCookieOptions() {
    const isProd = ENV.GYM_ENVIRONMENT === "production";
    return {
        httpOnly: true,
        secure: isProd,
        sameSite: (isProd ? "none" : "lax"),
        path: "/",
    };
}
function setSessionCookie(res, token) {
    res.cookie(COOKIE_NAME, token, {
        ...sessionCookieOptions(),
        maxAge: SEVEN_DAYS_MS,
    });
}
// POST /api/auth/register
export async function register(req, res) {
    const { user } = await authService.registerUser(req.body);
    const token = signJwt({ sub: user.id, email: user.email });
    setSessionCookie(res, token);
    res.status(201).json({ user: publicUser(user) });
}
// POST /api/auth/login
export async function login(req, res) {
    const { user } = await authService.loginUser(req.body);
    const token = signJwt({ sub: user.id, email: user.email });
    setSessionCookie(res, token);
    res.json({ user: publicUser(user) });
}
// POST /api/auth/logout
export async function logout(_req, res) {
    res.clearCookie(COOKIE_NAME, sessionCookieOptions());
    res.json({ ok: true });
}
// GET /api/auth/me
export async function me(req, res) {
    res.json({ user: req.user });
}
// POST /api/auth/forgot-password
//   Always returns ok to avoid email enumeration.
export async function forgotPassword(req, res) {
    await authService.requestPasswordReset(req.body.email);
    res.json({ ok: true });
}
// POST /api/auth/reset-password
export async function resetPassword(req, res) {
    await authService.resetUserPassword(req.body);
    res.json({ ok: true });
}
// POST /api/auth/verify-email
export async function verifyEmail(req, res) {
    await authService.verifyEmail(req.body.token);
    res.json({ ok: true });
}
// POST /api/auth/resend-verification (auth required)
export async function resendVerification(req, res) {
    if (!req.user)
        throw new HttpError(401, "Unauthorized");
    await authService.resendVerificationFor(req.user.id);
    res.json({ ok: true });
}
// POST /api/auth/oauth
export async function oauth(req, res) {
    const { provider, idToken } = req.body;
    const verified = await verifyIdToken(provider, idToken);
    const { user } = await authService.loginWithProvider({
        provider,
        providerAccountId: verified.providerAccountId,
        email: verified.email,
        name: verified.name,
        avatarUrl: verified.avatarUrl,
    });
    const token = signJwt({ sub: user.id, email: user.email });
    setSessionCookie(res, token);
    res.json({ user: publicUser(user) });
}
// ---------------------------------------------------------------------------
// Provider verification.
//   - google: `google-auth-library` -> OAuth2Client.verifyIdToken
//   - apple : verify against Apple's JWKS (e.g. `jose`) — not implemented yet
// ---------------------------------------------------------------------------
const googleClient = new OAuth2Client();
async function verifyIdToken(provider, idToken) {
    if (provider === "google") {
        if (!ENV.GOOGLE_CLIENT_ID) {
            throw new HttpError(501, "google sign-in is not configured");
        }
        const ticket = await googleClient
            .verifyIdToken({ idToken, audience: ENV.GOOGLE_CLIENT_ID })
            .catch(() => {
            throw new HttpError(401, "invalid google token");
        });
        const payload = ticket.getPayload();
        if (!payload?.sub || !payload.email) {
            throw new HttpError(401, "invalid google token");
        }
        if (payload.email_verified === false) {
            throw new HttpError(401, "google email not verified");
        }
        return {
            providerAccountId: payload.sub,
            email: payload.email,
            name: payload.name,
            avatarUrl: payload.picture,
        };
    }
    throw new HttpError(501, `${provider} verification not implemented yet`);
}
//# sourceMappingURL=auth.controller.js.map