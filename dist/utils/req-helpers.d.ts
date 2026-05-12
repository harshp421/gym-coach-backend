import type { Request } from "express";
/** Pull the authenticated user's id off the request, or 401. */
export declare function userId(req: Request): string;
/**
 * Pull a path param. Express 5 types `req.params[key]` as `string | string[]`
 * to cover wildcard captures, but our route patterns always produce a single
 * string at runtime. This helper enforces that and 400s if the param is
 * missing or somehow an array.
 */
export declare function paramId(req: Request, key: string): string;
//# sourceMappingURL=req-helpers.d.ts.map