import { randomUUID } from "node:crypto";
/**
 * Lightweight access log: one line per request once the response closes,
 * with method, path, status, duration, and (when available) user id.
 *
 * Stays in-process — no external logger lib. Adequate for dev + small-prod.
 * Swap for pino/winston if/when structured aggregation is needed.
 */
export function requestLogger() {
    return (req, res, next) => {
        const start = process.hrtime.bigint();
        const reqId = req.headers["x-request-id"] || shortId();
        // Echo so clients can correlate (and so other middleware can read it).
        res.setHeader("x-request-id", reqId);
        req.id = reqId;
        res.on("finish", () => {
            const durationMs = Number((process.hrtime.bigint() - start) / 1000000n);
            const userId = req.user?.id;
            const status = res.statusCode;
            const tag = statusTag(status);
            // Skip the docs UI's static asset spam.
            if (req.originalUrl.startsWith("/docs/") && status === 200)
                return;
            console.log(`${tag} ${req.method.padEnd(6)} ${status} ${durationMs.toString().padStart(4)}ms ${req.originalUrl}${userId ? ` user=${userId.slice(0, 8)}` : ""} (${reqId})`);
        });
        next();
    };
}
function statusTag(status) {
    if (status >= 500)
        return "[err]";
    if (status >= 400)
        return "[warn]";
    if (status >= 300)
        return "[redir]";
    return "[ok]";
}
function shortId() {
    return randomUUID().slice(0, 8);
}
//# sourceMappingURL=requestLogger.js.map