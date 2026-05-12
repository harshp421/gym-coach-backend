import jwt from "jsonwebtoken";
import { ENV } from "../config/env.config.js";
const EXPIRES_IN = "7d";
export function signJwt(payload) {
    return jwt.sign(payload, ENV.GYM_JWT_SECRET, { expiresIn: EXPIRES_IN });
}
export function verifyJwt(token) {
    const decoded = jwt.verify(token, ENV.GYM_JWT_SECRET);
    if (typeof decoded === "string") {
        throw new Error("Invalid token payload");
    }
    return decoded;
}
//# sourceMappingURL=jwt.js.map