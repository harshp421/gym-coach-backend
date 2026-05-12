import type { Request, Response, NextFunction } from "express"
import { verifyJwt } from "../utils/jwt.js"
import { findUserById } from "../features/auth/service/auth.service.js"
import { clearSessionCookie } from "../features/auth/session-cookie.js"
import "../features/auth/auth.types.js"

function reject(res: Response) {
    // Drop the dead cookie so the browser stops sending it on every request.
    clearSessionCookie(res)
    return res.status(401).json({ error: "Unauthorized" })
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
    const token: string | undefined = req.cookies?.gc_session
    if (!token) {
        return res.status(401).json({ error: "Unauthorized" })
    }
    try {
        const payload = verifyJwt(token)
        const user = await findUserById(payload.sub)
        if (!user) {
            return reject(res)
        }
        const { passwordHash: _omit, ...publicUser } = user
        req.user = publicUser
        next()
    } catch {
        return reject(res)
    }
}
