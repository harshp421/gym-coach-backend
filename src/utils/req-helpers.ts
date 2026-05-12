import type { Request } from "express"
import { HttpError } from "./http-error.js"

/** Pull the authenticated user's id off the request, or 401. */
export function userId(req: Request): string {
    if (!req.user) throw new HttpError(401, "Unauthorized")
    return req.user.id
}

/**
 * Pull a path param. Express 5 types `req.params[key]` as `string | string[]`
 * to cover wildcard captures, but our route patterns always produce a single
 * string at runtime. This helper enforces that and 400s if the param is
 * missing or somehow an array.
 */
export function paramId(req: Request, key: string): string {
    const v = req.params[key]
    if (typeof v !== "string" || v.length === 0) {
        throw new HttpError(400, `Missing ${key}`)
    }
    return v
}
