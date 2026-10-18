import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPlutoErrorStub } from './fixtures/i18n-stub'

// The guards use Nitro auto-imports (`createError`, `createPlutoError`) and
// `#supabase/server`. None of them exist outside a Nuxt build, so each is
// stubbed here.
let user: { sub: string } | null
let profileResult: {
  data: { is_admin: boolean } | null
  error: { message: string } | null
}
let capabilityResult: { data: boolean | null, error: { message: string } | null }

vi.mock('#supabase/server', () => ({
  serverSupabaseUser: async () => user,
  serverSupabaseClient: async () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ single: async () => profileResult }),
      }),
    }),
    rpc: async () => capabilityResult,
  }),
}))

beforeEach(() => {
  user = { sub: 'user-1' }
  profileResult = { data: { is_admin: true }, error: null }
  capabilityResult = { data: true, error: null }
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.stubGlobal('createError', (input: object) => input)
  vi.stubGlobal('createPlutoError', createPlutoErrorStub)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const { requireAdmin } = await import('../server/utils/admin-guard')
const { requireCapability } = await import('../server/utils/capability-guard')

const event = {} as never

describe('requireAdmin', () => {
  it('returns the user for an admin', async () => {
    await expect(requireAdmin(event)).resolves.toEqual({ sub: 'user-1' })
  })

  it('answers 401 with a key for a signed-out caller', async () => {
    user = null

    await expect(requireAdmin(event)).rejects.toMatchObject({
      statusCode: 401,
      statusMessage: 'You must be logged in.',
      data: { i18n: { key: 'supabase.errors.notLoggedIn' } },
    })
  })

  it('answers 403 with a key for a user who is not an admin', async () => {
    profileResult = { data: { is_admin: false }, error: null }

    await expect(requireAdmin(event)).rejects.toMatchObject({
      statusCode: 403,
      statusMessage: 'Your account is not an admin.',
      data: { i18n: { key: 'supabase.errors.notAdmin' } },
    })
  })
})

describe('requireCapability', () => {
  it('returns the user when the capability is held', async () => {
    await expect(requireCapability(event, 'users:read')).resolves.toEqual({
      sub: 'user-1',
    })
  })

  it('answers 401 with a key for a signed-out caller', async () => {
    user = null

    await expect(requireCapability(event, 'users:read')).rejects.toMatchObject({
      statusCode: 401,
      data: { i18n: { key: 'supabase.errors.notLoggedIn' } },
    })
  })

  it('answers 403 with the capability as a parameter', async () => {
    capabilityResult = { data: false, error: null }

    await expect(requireCapability(event, 'users:read')).rejects.toMatchObject({
      statusCode: 403,
      statusMessage: 'Your account is missing the "users:read" permission.',
      data: {
        i18n: {
          key: 'supabase.errors.missingPermission',
          params: { capability: 'users:read' },
        },
      },
    })
  })

  it('uses a custom message and key together', async () => {
    capabilityResult = { data: false, error: null }

    await expect(
      requireCapability(event, 'users:read', {
        message: 'No way.',
        messageKey: 'supabase.errors.notAdmin',
      })
    ).rejects.toMatchObject({
      statusMessage: 'No way.',
      data: { i18n: { key: 'supabase.errors.notAdmin' } },
    })
  })

  it('keeps a plain English error for a custom message with no key', async () => {
    capabilityResult = { data: false, error: null }

    await expect(
      requireCapability(event, 'users:read', { message: 'No way.' })
    ).rejects.toEqual({ statusCode: 403, statusMessage: 'No way.' })
  })
})
