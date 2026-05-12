import type { Request, Response, NextFunction } from "express"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { ENV } from "../config/env.config.js"

/**
 * Distributed rate limiting via Upstash, with an in-process fallback so
 * dev (and any deploy without Upstash creds) still gets back-pressure on
 * single-instance setups.
 *
 * Three named limiters are exported:
 *   - authLimiter:   burst protection for credential endpoints
 *   - coachLimiter:  protects the wallet — Groq calls are expensive
 *   - apiLimiter:    catch-all for everything else
 *
 * Key is `userId` for authenticated requests (so a logged-in user gets
 * their own bucket even behind a NAT) and `ip` otherwise.
 */

type LimitResult = {
    success: boolean
    /** Seconds until the bucket refills enough to allow another request. */
    retryAfterSec: number
    /** Remaining requests in the current window. */
    remaining: number
    /** Total bucket size. */
    limit: number
}

interface Limiter {
    check(key: string): Promise<LimitResult>
}

// ---------------------------------------------------------------------------
// Upstash-backed limiter (sliding window, accurate across instances)
// ---------------------------------------------------------------------------
class UpstashLimiter implements Limiter {
    private rl: Ratelimit
    constructor(redis: Redis, limit: number, windowSec: number, prefix: string) {
        this.rl = new Ratelimit({
            redis,
            limiter: Ratelimit.slidingWindow(limit, `${windowSec} s`),
            prefix: `rl:${prefix}`,
            analytics: false,
        })
    }
    async check(key: string): Promise<LimitResult> {
        try {
            const r = await this.rl.limit(key)
            const retryAfterMs = Math.max(0, r.reset - Date.now())
            return {
                success: r.success,
                retryAfterSec: Math.ceil(retryAfterMs / 1000),
                remaining: r.remaining,
                limit: r.limit,
            }
        } catch (err) {
            // Fail open — better to take the hit than to wedge auth if
            // Upstash has a hiccup. The error is logged in cache.ts already
            // for cache calls; we log once per limiter here.
            console.warn(
                `[ratelimit] upstash check failed (failing open): ${
                    err instanceof Error ? err.message : String(err)
                }`,
            )
            return { success: true, retryAfterSec: 0, remaining: 0, limit: 0 }
        }
    }
}

// ---------------------------------------------------------------------------
// In-process limiter (fixed window — simpler and good enough for dev)
// ---------------------------------------------------------------------------
class MemoryLimiter implements Limiter {
    private hits = new Map<string, { count: number; resetAt: number }>()
    constructor(
        private limit: number,
        private windowMs: number,
    ) {}
    async check(key: string): Promise<LimitResult> {
        const now = Date.now()
        const entry = this.hits.get(key)
        if (!entry || entry.resetAt <= now) {
            this.hits.set(key, { count: 1, resetAt: now + this.windowMs })
            // Opportunistic GC so the map doesn't grow forever in long runs.
            if (this.hits.size > 5000) this.gc(now)
            return {
                success: true,
                retryAfterSec: Math.ceil(this.windowMs / 1000),
                remaining: this.limit - 1,
                limit: this.limit,
            }
        }
        entry.count += 1
        const remaining = Math.max(0, this.limit - entry.count)
        return {
            success: entry.count <= this.limit,
            retryAfterSec: Math.ceil((entry.resetAt - now) / 1000),
            remaining,
            limit: this.limit,
        }
    }
    private gc(now: number) {
        for (const [k, v] of this.hits) {
            if (v.resetAt <= now) this.hits.delete(k)
        }
    }
}

// ---------------------------------------------------------------------------
// Backend selection
// ---------------------------------------------------------------------------
const upstashRedis =
    ENV.UPSTASH_REDIS_REST_URL && ENV.UPSTASH_REDIS_REST_TOKEN
        ? new Redis({
              url: ENV.UPSTASH_REDIS_REST_URL,
              token: ENV.UPSTASH_REDIS_REST_TOKEN,
          })
        : null

function makeLimiter(
    limit: number,
    windowSec: number,
    prefix: string,
): Limiter {
    if (upstashRedis) return new UpstashLimiter(upstashRedis, limit, windowSec, prefix)
    return new MemoryLimiter(limit, windowSec * 1000)
}

console.log(
    `[ratelimit] backend=${upstashRedis ? "upstash" : "memory"}`,
)

// ---------------------------------------------------------------------------
// Pre-baked limiters used by the app
// ---------------------------------------------------------------------------
//   - auth:   credential stuffing / abuse defense
//   - coach:  Groq is the most expensive call in the system; keep it tight
//   - api:    catch-all for everything else (mostly authenticated traffic)
const limiters = {
    auth: makeLimiter(10, 600, "auth"), // 10 reqs / 10 min
    coach: makeLimiter(20, 3600, "coach"), // 20 reqs / hour
    diet: makeLimiter(10, 3600, "diet"), // 10 plan generations / hour
    api: makeLimiter(300, 900, "api"), // 300 reqs / 15 min
}

// ---------------------------------------------------------------------------
// Express middleware factory
// ---------------------------------------------------------------------------
export function rateLimit(name: keyof typeof limiters) {
    const limiter = limiters[name]
    return async (req: Request, res: Response, next: NextFunction) => {
        const key = `${name}:${identify(req)}`
        const result = await limiter.check(key)
        res.setHeader("X-RateLimit-Limit", String(result.limit))
        res.setHeader("X-RateLimit-Remaining", String(result.remaining))
        if (!result.success) {
            res.setHeader("Retry-After", String(result.retryAfterSec))
            return res.status(429).json({
                error: "Too many requests",
                retryAfterSec: result.retryAfterSec,
            })
        }
        next()
    }
}

function identify(req: Request): string {
    // Authenticated user → bucket by user id (works behind NAT).
    if (req.user?.id) return `u:${req.user.id}`
    // Unauthed → bucket by ip. trust proxy in app.ts makes req.ip reflect
    // X-Forwarded-For when set.
    return `ip:${req.ip ?? "unknown"}`
}
