import jwt from "jsonwebtoken"
import { ENV } from "../config/env.config.js"
import type { JwtPayload } from "../features/auth/auth.types.js"

const EXPIRES_IN = "7d"

export function signJwt(payload: JwtPayload): string {
    return jwt.sign(payload, ENV.GYM_JWT_SECRET, { expiresIn: EXPIRES_IN })
}

export function verifyJwt(token: string): JwtPayload {
    const decoded = jwt.verify(token, ENV.GYM_JWT_SECRET)
    if (typeof decoded === "string") {
        throw new Error("Invalid token payload")
    }
    return decoded as JwtPayload
}
