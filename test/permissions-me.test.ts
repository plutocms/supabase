import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// The route uses Nitro auto-imports (`defineEventHandler`) and
// `#supabase/server`. None of them exist outside a Nuxt build, so each is
// stubbed here.
let user: { sub: string } | null
let capabilityResult: { data: string[] | null, error: { message: string } | null }
let profileResult: { data: { is_admin: boolean } | null, error: { message: string } | null }

vi.mock('#supabase/server', () => ({
  serverSupabaseUser: async () => user,
  serverSupabaseClient: async () => ({
    rpc: async () => capabilityResult,
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => profileResult }),
      }),
    }),
  }),
}))

beforeEach(() => {
  user = { sub: 'user-1' }
  capabilityResult = { data: ['products:manage'], error: null }
  profileResult = { data: { is_admin: false }, error: null }
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

async function call() {
  const { default: handler } = await import('../server/api/permissions/me.get')
  return (handler as (event: unknown) => Promise<{ capabilities: string[] }>)({})
}

describe('the /api/permissions/me route', () => {
  it('returns an empty list for a signed-out caller', async () => {
    user = null
    expect(await call()).toEqual({ capabilities: [] })
  })

  it('returns the capabilities from my_capabilities()', async () => {
    expect(await call()).toEqual({ capabilities: ['products:manage'] })
  })

  it('gives an admin ["*"] when my_capabilities() is missing', async () => {
    capabilityResult = { data: null, error: { message: 'function does not exist' } }
    profileResult = { data: { is_admin: true }, error: null }
    expect(await call()).toEqual({ capabilities: ['*'] })
  })

  it('gives a non-admin an empty list when my_capabilities() is missing', async () => {
    capabilityResult = { data: null, error: { message: 'function does not exist' } }
    expect(await call()).toEqual({ capabilities: [] })
  })

  it('gives an empty list when the profile lookup fails too', async () => {
    capabilityResult = { data: null, error: { message: 'function does not exist' } }
    profileResult = { data: null, error: { message: 'no such column' } }
    expect(await call()).toEqual({ capabilities: [] })
  })
})
