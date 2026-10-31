import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPlutoErrorStub } from './fixtures/i18n-stub'

beforeEach(() => {
  vi.stubGlobal('createError', (input: object) => input)
  vi.stubGlobal('createPlutoError', createPlutoErrorStub)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const { ACCESS_ERRORS, mapAccessError, parseAccessCode } =
  await import('../server/utils/access-errors')

describe('parseAccessCode', () => {
  it('reads the code of a pluto message', () => {
    expect(
      parseAccessCode({ code: 'P0001', message: 'pluto:last_admin' })
    ).toBe('last_admin')
  })

  it('ignores an unknown code and a plain message', () => {
    expect(
      parseAccessCode({ code: 'P0001', message: 'pluto:nope' })
    ).toBeUndefined()
    expect(parseAccessCode({ code: 'P0001', message: 'boom' })).toBeUndefined()
    expect(parseAccessCode(null)).toBeUndefined()
  })

  it('reads a Postgres permission error as forbidden', () => {
    expect(
      parseAccessCode({
        code: '42501',
        message: 'permission denied for function x',
      })
    ).toBe('forbidden')
  })
})

describe('mapAccessError', () => {
  const cases: Array<[string, number, string]> = [
    ['last_admin', 409, 'supabase.access.errors.lastAdmin'],
    ['forbidden', 403, 'supabase.access.errors.forbidden'],
    ['role_exists', 409, 'supabase.access.errors.roleExists'],
    ['builtin_role', 400, 'supabase.access.errors.builtinRole'],
    ['wildcard', 400, 'supabase.access.errors.wildcard'],
    ['empty_role', 400, 'supabase.access.errors.emptyRole'],
    ['unknown_role', 400, 'supabase.access.errors.unknownRole'],
  ]

  it.each(cases)('%s gives %i with its key', (code, statusCode, key) => {
    expect(
      mapAccessError({ code: 'P0001', message: `pluto:${code}` })
    ).toMatchObject({
      statusCode,
      data: { i18n: { key } },
    })
  })

  it('gives 409 when the access functions are missing', () => {
    expect(
      mapAccessError({
        code: 'PGRST202',
        message: 'Could not find the function',
      })
    ).toMatchObject({
      statusCode: 409,
      data: { i18n: { key: 'supabase.access.errors.migrationPending' } },
    })
  })

  it('gives a plain 500 for any other error', () => {
    expect(mapAccessError({ code: 'XX000', message: 'boom' })).toEqual({
      statusCode: 500,
      statusMessage: 'boom',
    })
  })

  it('has a camel-case key under supabase.access.errors for every code', () => {
    for (const { key } of Object.values(ACCESS_ERRORS)) {
      expect(key).toMatch(/^supabase.access.errors.[a-zA-Z]+$/)
    }
  })
})
