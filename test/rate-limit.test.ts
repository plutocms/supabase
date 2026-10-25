import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRateLimiter } from '../server/utils/rate-limit'
import { createPlutoErrorStub } from './fixtures/i18n-stub'

describe('createRateLimiter', () => {
  it('allows the limit and refuses the next hit', () => {
    const limiter = createRateLimiter({ limit: 3, windowMs: 1000 }, () => 0)

    expect([1, 2, 3].map(() => limiter.hit('a').ok)).toEqual([true, true, true])
    expect(limiter.hit('a')).toEqual({ ok: false, retryAfter: 1 })
  })

  it('counts each key alone', () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000 }, () => 0)

    expect(limiter.hit('a').ok).toBe(true)
    expect(limiter.hit('b').ok).toBe(true)
    expect(limiter.hit('a').ok).toBe(false)
  })

  it('allows a hit again after the window', () => {
    let time = 0
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000 }, () => time)

    limiter.hit('a')
    time = 999
    expect(limiter.hit('a').ok).toBe(false)
    time = 1000
    expect(limiter.hit('a').ok).toBe(true)
  })

  it('does not count a refused hit', () => {
    let time = 0
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000 }, () => time)

    limiter.hit('a')
    time = 500
    limiter.hit('a')
    time = 1000
    expect(limiter.hit('a').ok).toBe(true)
  })

  it('reports the seconds to wait', () => {
    let time = 0
    const limiter = createRateLimiter({ limit: 1, windowMs: 600_000 }, () => time)

    limiter.hit('a')
    time = 60_000
    expect(limiter.hit('a').retryAfter).toBe(540)
  })
})

describe('enforceInviteRateLimit', () => {
  beforeEach(() => {
    vi.stubGlobal('createPlutoError', createPlutoErrorStub)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('allows 10 invites and answers 429 for the 11th', async () => {
    const { enforceInviteRateLimit } = await import('../server/utils/rate-limit')

    for (let i = 0; i < 10; i++) {
      expect(() => enforceInviteRateLimit('limit-user')).not.toThrow()
    }

    expect(() => enforceInviteRateLimit('limit-user')).toThrow(
      expect.objectContaining({
        statusCode: 429,
        data: expect.objectContaining({
          i18n: expect.objectContaining({
            key: 'supabase.access.errors.rateLimited',
          }),
        }),
      })
    )
    expect(() => enforceInviteRateLimit('other-user')).not.toThrow()
  })
})
