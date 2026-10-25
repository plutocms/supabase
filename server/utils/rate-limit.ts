/**
 * A small in-memory rate limiter. It keeps the hit times of each key in a
 * sliding window. The state lives in one server process, so it is a brake
 * for a single instance, not a global limit.
 */

export interface RateLimitOptions {
  /** The number of hits allowed in the window. */
  limit: number
  /** The window length, in milliseconds. */
  windowMs: number
}

export interface RateLimitResult {
  ok: boolean
  /** Seconds until the next hit is allowed. 0 when `ok`. */
  retryAfter: number
}

export function createRateLimiter(
  options: RateLimitOptions,
  now: () => number = Date.now
) {
  const hits = new Map<string, number[]>()

  return {
    /** Counts one hit for the key. It does not count a refused hit. */
    hit(key: string): RateLimitResult {
      const time = now()
      const recent = (hits.get(key) ?? []).filter(
        (stamp) => time - stamp < options.windowMs
      )

      if (recent.length >= options.limit) {
        hits.set(key, recent)

        return {
          ok: false,
          retryAfter: Math.max(
            1,
            Math.ceil((recent[0]! + options.windowMs - time) / 1000)
          ),
        }
      }

      recent.push(time)
      hits.set(key, recent)

      // Drop the keys that have no recent hit, so the map does not grow.
      if (hits.size > 1000) {
        for (const [other, stamps] of hits) {
          if (stamps.every((stamp) => time - stamp >= options.windowMs)) {
            hits.delete(other)
          }
        }
      }

      return { ok: true, retryAfter: 0 }
    },
    reset() {
      hits.clear()
    },
  }
}

/** 10 invites per 10 minutes for each caller. */
const inviteLimiter = createRateLimiter({ limit: 10, windowMs: 10 * 60 * 1000 })

/**
 * Throws a 429 when the caller sent too many invites. `sub` is the user id
 * of the caller (the JWT `sub` claim).
 */
export function enforceInviteRateLimit(sub: string) {
  const result = inviteLimiter.hit(sub)

  if (!result.ok) {
    throw createPlutoError({
      statusCode: 429,
      message: 'Too many invites. Wait a few minutes and try again.',
      key: 'supabase.access.errors.rateLimited',
      data: { retryAfter: result.retryAfter },
    })
  }
}
