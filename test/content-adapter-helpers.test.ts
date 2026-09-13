import type { PlutoContentType } from '@plutocms/pluto/shared/types/content'
import { PostgrestError } from '@supabase/supabase-js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// content-adapter.ts imports `serverSupabaseClient` from '#supabase/server',
// a virtual module Nitro only resolves inside a real Nuxt build. Stubbed
// here so the module can load under plain `vitest run`, which never runs
// a Nuxt build — this test never calls the stub, it only needs the import
// to resolve.
vi.mock('#supabase/server', () => ({ serverSupabaseClient: vi.fn() }))

const { resolveStatusColumn, resolveTimestampColumn, toContentError } = await import('../server/utils/content-adapter')

// `toContentError` calls the global `createError`, which Nitro normally
// auto-imports from 'h3'. Outside a Nuxt/Nitro build there is no such
// global at runtime, so it is stubbed the same way `nuxt-config.test.ts`
// stubs `defineNuxtConfig` — returning the input object unchanged is
// enough to assert on `statusCode`/`statusMessage`. Unlike
// `defineNuxtConfig`, no local `declare global` is needed here: this file
// imports `content-adapter.ts`, a server file already inside Nitro's own
// ambient project reference, which already declares `createError`'s
// global type — redeclaring it here collided with that (TS2451).
beforeEach(() => {
  vi.stubGlobal('createError', (input: object) => input)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

/** Builds a minimal `PlutoContentType` fixture, overridden per test. */
function makeType(overrides: Partial<PlutoContentType> = {}): PlutoContentType {
  return {
    name: 'widget',
    label: 'Widget',
    labelPlural: 'Widgets',
    source: 'widgets',
    titleField: 'title',
    fields: [],
    ...overrides,
  }
}

describe('resolveTimestampColumn', () => {
  it('defaults to created_at for "created"', () => {
    expect(resolveTimestampColumn(makeType(), 'created')).toBe('created_at')
  })

  it('defaults to updated_at for "updated"', () => {
    expect(resolveTimestampColumn(makeType(), 'updated')).toBe('updated_at')
  })

  it('returns undefined when timestamps are disabled entirely', () => {
    const type = makeType({ timestamps: false })

    expect(resolveTimestampColumn(type, 'created')).toBeUndefined()
    expect(resolveTimestampColumn(type, 'updated')).toBeUndefined()
  })

  it('returns undefined when only the one timestamp is disabled', () => {
    const type = makeType({ timestamps: { created: false } })

    expect(resolveTimestampColumn(type, 'created')).toBeUndefined()
    expect(resolveTimestampColumn(type, 'updated')).toBe('updated_at')
  })

  it('honors a custom column name override', () => {
    const type = makeType({ timestamps: { created: 'inserted_at', updated: 'changed_at' } })

    expect(resolveTimestampColumn(type, 'created')).toBe('inserted_at')
    expect(resolveTimestampColumn(type, 'updated')).toBe('changed_at')
  })
})

describe('resolveStatusColumn', () => {
  it('defaults to "status"', () => {
    const type = makeType({ status: { values: [] } })

    expect(resolveStatusColumn(type)).toBe('status')
  })

  it('returns undefined when status is unset', () => {
    expect(resolveStatusColumn(makeType())).toBeUndefined()
  })

  it('returns undefined when status is disabled entirely', () => {
    expect(resolveStatusColumn(makeType({ status: false }))).toBeUndefined()
  })

  it('honors a custom column name override', () => {
    const type = makeType({ status: { column: 'publish_state', values: [] } })

    expect(resolveStatusColumn(type)).toBe('publish_state')
  })
})

describe('toContentError', () => {
  it('maps 23505 (unique_violation) to a 409', () => {
    const error = new PostgrestError({ message: 'duplicate key', details: '', hint: '', code: '23505' })
    const result = toContentError(error)

    expect(result.statusCode).toBe(409)
    expect(result.statusMessage).toBe('A record with this value already exists.')
  })

  it('maps 23503 (foreign_key_violation) to a 400', () => {
    const error = new PostgrestError({ message: 'violates foreign key', details: '', hint: '', code: '23503' })
    const result = toContentError(error)

    expect(result.statusCode).toBe(400)
    expect(result.statusMessage).toBe('This references a record that does not exist.')
  })

  it('maps any other code to a 500, using the raw message', () => {
    const error = new PostgrestError({ message: 'connection refused', details: '', hint: '', code: '08006' })
    const result = toContentError(error)

    expect(result.statusCode).toBe(500)
    expect(result.statusMessage).toBe('connection refused')
  })

  it('logs the raw error before returning the mapped one', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const error = new PostgrestError({ message: 'duplicate key', details: '', hint: '', code: '23505' })

    toContentError(error)

    expect(consoleError).toHaveBeenCalledWith(expect.any(String), error)
    consoleError.mockRestore()
  })
})
