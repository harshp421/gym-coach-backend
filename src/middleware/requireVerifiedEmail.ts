import type { Request, Response, NextFunction } from "express"

// Run AFTER requireAuth. Returns 403 with a stable code so the frontend
// can render a "verify your email to use this" prompt.
export function requireVerifiedEmail(req: Request, res: Response, next: NextFunction) {
    if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" })
    }
    if (!req.user.emailVerified) {
        return res.status(403).json({
            error: "Email not verified",
            code: "EMAIL_NOT_VERIFIED",
        })
    }
    next()
}
