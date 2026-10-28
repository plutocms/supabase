import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { failureData } from '../app/utils/api-failure'
import { createPlutoErrorStub } from './fixtures/i18n-stub'

// The routes use Nitro auto-imports and `#supabase/server`. Each is stubbed.
let signUpResult: {
  data: unknown
  error: { message: string; status?: number; code?: string } | null
}
let user: { sub: string } | null
let isAdmin: boolean

vi.mock('#supabase/server', () => ({
  serverSupabaseClient: async () => ({
    auth: { signUp: async () => signUpResult },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: { is_admin: isAdmin }, error: null }),
        }),
      }),
    }),
  }),
  serverSupabaseUser: async () => user,
}))

const body = {
  username: 'victor',
  display_name: 'Victor',
  email: 'v@example.com',
  password: 'secret1',
}

beforeEach(() => {
  signUpResult = { data: { user: {} }, error: null }
  user = { sub: 'user-1' }
  isAdmin = true
  delete process.env.DATABASE_URL
  vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
  vi.stubGlobal('createError', (input: object) => input)
  vi.stubGlobal('createPlutoError', createPlutoErrorStub)
  vi.stubGlobal('readBody', async () => body)
  vi.stubGlobal('useRuntimeConfig', () => ({ plutoLayerMigrations: {} }))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

type Handler = (event: unknown) => Promise<unknown>

describe('pOST /api/_pluto/supabase/auth/signup', () => {
  it('answers a Supabase Auth failure as an HTTP error with the code in data', async () => {
    signUpResult = {
      data: null,
      error: {
        message: 'User already registered',
        status: 422,
        code: 'user_already_exists',
      },
    }
    const handler = (
      await import('../server/api/_pluto/supabase/auth/signup.post')
    ).default as unknown as Handler

    await expect(handler({})).rejects.toMatchObject({
      statusCode: 422,
      statusMessage: 'User already registered',
      data: {
        code: 'user_already_exists',
        i18n: { key: 'supabase.errors.signupFailed' },
      },
    })
  })

  it('answers a server-side Auth failure as 502', async () => {
    signUpResult = { data: null, error: { message: 'boom', status: 500 } }
    const handler = (
      await import('../server/api/_pluto/supabase/auth/signup.post')
    ).default as unknown as Handler

    await expect(handler({})).rejects.toMatchObject({ statusCode: 502 })
  })

  it('answers success in the same body as before', async () => {
    const handler = (
      await import('../server/api/_pluto/supabase/auth/signup.post')
    ).default as unknown as Handler

    expect(await handler({})).toMatchObject({ success: true })
  })
})

describe('pOST /api/_pluto/supabase/migrations/run', () => {
  it('answers 400 with needsConnectionString in data when no connection string exists', async () => {
    vi.stubGlobal('readBody', async () => undefined)
    const handler = (
      await import('../server/api/_pluto/supabase/migrations/run.post')
    ).default as unknown as Handler

    await expect(handler({})).rejects.toMatchObject({
      statusCode: 400,
      data: {
        needsConnectionString: true,
        i18n: { key: 'supabase.errors.connectionStringRequired' },
      },
    })
  })
})

describe('failureData', () => {
  it('reads the data of a $fetch error', () => {
    expect(
      failureData({ data: { statusCode: 500, data: { error: 'x' } } })
    ).toEqual({ error: 'x' })
  })

  it('returns undefined when the error has no data', () => {
    expect(failureData(new Error('x'))).toBeUndefined()
    expect(failureData(null)).toBeUndefined()
  })
})
