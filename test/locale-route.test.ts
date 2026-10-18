import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPlutoErrorStub } from './fixtures/i18n-stub'

// The routes use Nitro auto-imports (`defineEventHandler`, `createError`,
// `createPlutoError`, `readBody`, `useRuntimeConfig`) and `#supabase/server`.
// None of them exist outside a Nuxt build, so each is stubbed here. A stub
// `createError` returns its input, so a test can assert on `statusCode`.
interface DbError {
  message: string
  code?: string
}

let user: { sub: string } | null
let body: unknown
let selectResult: {
  data: { locale: string | null } | null
  error: DbError | null
}
let rpcResult: { error: DbError | null }
const rpc = vi.fn()
const eq = vi.fn()

vi.mock('#supabase/server', () => ({
  serverSupabaseUser: async () => user,
  serverSupabaseClient: async () => ({
    from: () => ({
      select: () => ({
        eq: (...args: unknown[]) => {
          eq(...args)
          return { maybeSingle: async () => selectResult }
        },
      }),
    }),
    rpc: async (...args: unknown[]) => {
      rpc(...args)
      return rpcResult
    },
  }),
}))

beforeEach(() => {
  user = { sub: 'user-1' }
  body = { locale: 'pt-BR' }
  selectResult = { data: { locale: 'pt-BR' }, error: null }
  rpcResult = { error: null }
  rpc.mockClear()
  eq.mockClear()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
  vi.stubGlobal('readBody', async () => body)
  vi.stubGlobal('createError', (input: object) => input)
  vi.stubGlobal('createPlutoError', createPlutoErrorStub)
  vi.stubGlobal('useRuntimeConfig', () => ({
    public: { plutoI18n: { adminLocales: ['en', 'pt-BR'] } },
  }))
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

type Handler = (event: unknown) => Promise<unknown>

async function getHandler(): Promise<Handler> {
  return (await import('../server/api/profile/locale.get'))
    .default as unknown as Handler
}

async function postHandler(): Promise<Handler> {
  return (await import('../server/api/profile/locale.post'))
    .default as unknown as Handler
}

describe('gET /api/profile/locale', () => {
  it('returns the stored locale, read by user.sub', async () => {
    expect(await (await getHandler())({})).toEqual({ locale: 'pt-BR' })
    expect(eq).toHaveBeenCalledWith('id', 'user-1')
  })

  it('returns null when the user chose Automatic', async () => {
    selectResult = { data: { locale: null }, error: null }

    expect(await (await getHandler())({})).toEqual({ locale: null })
  })

  it('returns null for a signed-out caller, without a query', async () => {
    user = null

    expect(await (await getHandler())({})).toEqual({ locale: null })
    expect(eq).not.toHaveBeenCalled()
  })

  it('degrades to null when the column is missing (migration pending)', async () => {
    selectResult = {
      data: null,
      error: {
        message: 'column profiles.locale does not exist',
        code: '42703',
      },
    }

    expect(await (await getHandler())({})).toEqual({ locale: null })
  })
})

describe('pOST /api/profile/locale', () => {
  it('rejects a signed-out caller with 401', async () => {
    user = null

    await expect((await postHandler())({})).rejects.toMatchObject({
      statusCode: 401,
      data: { i18n: { key: 'supabase.errors.notLoggedIn' } },
    })
    expect(rpc).not.toHaveBeenCalled()
  })

  it('rejects a body that does not match the schema with 400', async () => {
    for (const bad of [undefined, {}, { locale: 5 }, { locale: undefined }]) {
      body = bad

      await expect((await postHandler())({})).rejects.toMatchObject({
        statusCode: 400,
      })
    }
    expect(rpc).not.toHaveBeenCalled()
  })

  it('rejects a locale that the admin does not offer with 400', async () => {
    body = { locale: 'fr' }

    await expect((await postHandler())({})).rejects.toMatchObject({
      statusCode: 400,
      data: { i18n: { key: 'supabase.errors.localeUnsupported' } },
    })
    expect(rpc).not.toHaveBeenCalled()
  })

  it('saves a supported locale through set_my_locale', async () => {
    expect(await (await postHandler())({})).toEqual({ locale: 'pt-BR' })
    expect(rpc).toHaveBeenCalledWith('set_my_locale', { new_locale: 'pt-BR' })
  })

  it('saves null for Automatic', async () => {
    body = { locale: null }

    expect(await (await postHandler())({})).toEqual({ locale: null })
    expect(rpc).toHaveBeenCalledWith('set_my_locale', { new_locale: null })
  })

  it('answers 409 with the migration-pending key when the function is missing', async () => {
    const errors: DbError[] = [
      { code: 'PGRST202', message: 'x' },
      { code: '42883', message: 'x' },
      {
        message:
          'Could not find the function public.set_my_locale(new_locale) in the schema cache',
      },
    ]

    for (const error of errors) {
      rpcResult = { error }

      await expect((await postHandler())({})).rejects.toMatchObject({
        statusCode: 409,
        data: { i18n: { key: 'supabase.profile.migrationPending' } },
      })
    }
  })

  it('answers 500 with the message for another error', async () => {
    rpcResult = { error: { message: 'boom', code: 'XX000' } }

    await expect((await postHandler())({})).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: 'boom',
    })
  })
})
