import { Redis } from "@upstash/redis"
import { ENV } from "../config/env.config.js"

/**
 * Tiny cache layer with two backends:
 *   1. Upstash Redis (when UPSTASH_REDIS_REST_* are set) — distributed,
 *      survives restarts, shared across instances.
 *   2. In-process Map (otherwise) — single-instance dev fallback so the
 *      app still runs without Upstash configured.
 *
 * Don't reach for this for user-specific mutable data — invalidation is
 * the hard part. Cache things that are read-heavy and either immutable
 * or refresh-tolerant (the system exercise catalog is the prototype).
 */

interface CacheBackend {
    get<T>(key: string): Promise<T | null>
    set<T>(key: string, value: T, ttlSec: number): Promise<void>
    del(key: string): Promise<void>
}

class UpstashBackend implements CacheBackend {
    constructor(private redis: Redis) {}

    async get<T>(key: string): Promise<T | null> {
        try {
            // Upstash auto-deserializes JSON; returns null for misses.
            return ((await this.redis.get(key)) as T | null) ?? null
        } catch (err) {
            console.warn(`[cache] redis get failed for ${key}:`, errMsg(err))
            return null
        }
    }

    async set<T>(key: string, value: T, ttlSec: number): Promise<void> {
        try {
            await this.redis.set(key, value, { ex: ttlSec })
        } catch (err) {
            console.warn(`[cache] redis set failed for ${key}:`, errMsg(err))
        }
    }

    async del(key: string): Promise<void> {
        try {
            await this.redis.del(key)
        } catch (err) {
            console.warn(`[cache] redis del failed for ${key}:`, errMsg(err))
        }
    }
}

class MemoryBackend implements CacheBackend {
    private store = new Map<string, { value: unknown; expiresAt: number }>()
    private static readonly MAX_ENTRIES = 500

    async get<T>(key: string): Promise<T | null> {
        const entry = this.store.get(key)
        if (!entry) return null
        if (entry.expiresAt < Date.now()) {
            this.store.delete(key)
            return null
        }
        return entry.value as T
    }

    async set<T>(key: string, value: T, ttlSec: number): Promise<void> {
        // Cheap cap so a runaway loader can't OOM the process.
        if (this.store.size >= MemoryBackend.MAX_ENTRIES) {
            const oldestKey = this.store.keys().next().value
            if (oldestKey !== undefined) this.store.delete(oldestKey)
        }
        this.store.set(key, {
            value,
            expiresAt: Date.now() + ttlSec * 1000,
        })
    }

    async del(key: string): Promise<void> {
        this.store.delete(key)
    }
}

function makeBackend(): { backend: CacheBackend; kind: "upstash" | "memory" } {
    if (ENV.UPSTASH_REDIS_REST_URL && ENV.UPSTASH_REDIS_REST_TOKEN) {
        const redis = new Redis({
            url: ENV.UPSTASH_REDIS_REST_URL,
            token: ENV.UPSTASH_REDIS_REST_TOKEN,
        })
        return { backend: new UpstashBackend(redis), kind: "upstash" }
    }
    return { backend: new MemoryBackend(), kind: "memory" }
}

const { backend, kind } = makeBackend()
console.log(`[cache] backend=${kind}`)

export const cache = backend
export const cacheBackend = kind

/**
 * Read-through helper: returns the cached value or runs `loader`, caches
 * the result, and returns it. Negative results (null / undefined) are
 * intentionally not cached so a transient miss doesn't poison the entry.
 */
export async function cached<T>(
    key: string,
    ttlSec: number,
    loader: () => Promise<T>,
): Promise<T> {
    const hit = await cache.get<T>(key)
    if (hit !== null) return hit
    const value = await loader()
    if (value !== null && value !== undefined) {
        await cache.set(key, value, ttlSec)
    }
    return value
}

function errMsg(err: unknown): string {
    return err instanceof Error ? err.message : String(err)
}
