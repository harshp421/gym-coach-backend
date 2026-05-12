import type { Request, Response, NextFunction } from "express";
/**
 * Lightweight access log: one line per request once the response closes,
 * with method, path, status, duration, and (when available) user id.
 *
 * Stays in-process — no external logger lib. Adequate for dev + small-prod.
 * Swap for pino/winston if/when structured aggregation is needed.
 */
export declare function requestLogger(): (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=requestLogger.d.ts.map