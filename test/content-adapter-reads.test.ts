import type { PlutoContentType } from '@plutocms/pluto/shared/types/content'
import { fieldColumn, mapColumnsToFields } from '@plutocms/pluto/shared/utils/content-map'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Both client sources are fakes. The session client comes from
// '#supabase/server'. The anonymous client comes from `createClient`.
const sessionFrom = vi.fn()
const anonymousFrom = vi.fn()
const createClient = vi.fn()

vi.mock('#supabase/server', () => ({
  serverSupabaseClient: vi.fn(async () => ({ from: sessionFrom })),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => {
    createClient(...args)

    return { from: anonymousFrom }
  },
}))

const { createSupabaseContentAdapter } = await import('../server/utils/content-adapter')

/** A chainable stand-in for a PostgREST builder. It records each call and resolves to `result`. */
function makeBuilder(result: { data: unknown, error: unknown, count?: number }) {
  const calls: Array<[string, unknown[]]> = []
  const builder: Record<string, unknown> = {
    then: (resolve: (value: unknown) => unknown) => resolve(result),
  }

  for (const name of ['select', 'eq', 'ilike', 'order', 'range', 'limit']) {
    builder[name] = (...args: unknown[]) => {
      calls.push([name, args])

      return builder
    }
  }
  builder.maybeSingle = async () => result

  return { builder, calls }
}

function makeType(overrides: Partial<PlutoContentType> = {}): PlutoContentType {
  return {
    name: 'post',
    label: 'Post',
    labelPlural: 'Posts',
    source: 'posts',
    titleField: 'title',
    fields: [
      { name: 'title', type: 'text' },
      { name: 'rank', type: 'number' },
    ],
    ...overrides,
  } as PlutoContentType
}

const row = {
  id: 1,
  title: 'Hello',
  rank: 3,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
  published_at: '2026-01-03T00:00:00Z',
  secret: 'x',
}

let publicRead = false

function ctxFor(type: PlutoContentType) {
  return { event: {}, type } as never
}

beforeEach(() => {
  publicRead = false
  vi.stubGlobal('fieldColumn', fieldColumn)
  vi.stubGlobal('mapColumnsToFields', mapColumnsToFields)
  vi.stubGlobal('isPublicRead', () => publicRead)
  vi.stubGlobal('useRuntimeConfig', () => ({
    public: { supabase: { url: 'https://example.supabase.co', key: 'anon-key' } },
  }))
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('list filters', () => {
  it('applies one equality per filter, on the field column', async () => {
    const { builder, calls } = makeBuilder({ data: [], error: null, count: 0 })
    sessionFrom.mockReturnValue(builder)
    const type = makeType({
      fields: [{ name: 'title', type: 'text' }, { name: 'rank', type: 'number', column: 'rank_num' }],
    } as never)

    await createSupabaseContentAdapter().list(ctxFor(type), { filters: { title: 'Hello', rank: '3' } })

    expect(calls).toContainEqual(['eq', ['title', 'Hello']])
    expect(calls).toContainEqual(['eq', ['rank_num', '3']])
  })
})

describe('timestamps', () => {
  it('copies the created, updated and published-at columns onto a listed item', async () => {
    const { builder } = makeBuilder({ data: [row], error: null, count: 1 })
    sessionFrom.mockReturnValue(builder)
    const type = makeType({ status: { publishedAtColumn: 'published_at' } } as never)

    const result = await createSupabaseContentAdapter().list(ctxFor(type), {})

    expect(result.data[0]).toMatchObject({
      id: 1,
      title: 'Hello',
      created_at: row.created_at,
      updated_at: row.updated_at,
      published_at: row.published_at,
    })
    expect(result.data[0]).not.toHaveProperty('secret')
  })

  it('copies them onto one item by id', async () => {
    const { builder } = makeBuilder({ data: row, error: null })
    sessionFrom.mockReturnValue(builder)

    const item = await createSupabaseContentAdapter().get(ctxFor(makeType()), 1)

    expect(item).toMatchObject({ created_at: row.created_at, updated_at: row.updated_at })
    expect(item).not.toHaveProperty('published_at')
  })

  it('names the timestamp columns in timestampKeys', () => {
    const adapter = createSupabaseContentAdapter()
    const type = makeType({ status: { publishedAtColumn: 'published_at' } } as never)

    expect(adapter.timestampKeys!(type)).toEqual({
      created: 'created_at',
      updated: 'updated_at',
      published: 'published_at',
    })
    expect(adapter.timestampKeys!(makeType({ timestamps: false }))).toEqual({})
    expect(adapter.timestampKeys!(makeType({ timestamps: { created: 'made_at', updated: false } }))).toEqual({
      created: 'made_at',
    })
  })

  it('sorts by a timestamp column without a warning', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { builder, calls } = makeBuilder({ data: [], error: null, count: 0 })
    sessionFrom.mockReturnValue(builder)

    await createSupabaseContentAdapter().list(ctxFor(makeType()), {
      sort: { field: 'updated_at', direction: 'desc' },
    })

    expect(calls).toContainEqual(['order', ['updated_at', { ascending: false }]])
    expect(warn).not.toHaveBeenCalled()
  })

  it('still warns for a sort field that is neither a field nor a timestamp', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { builder } = makeBuilder({ data: [], error: null, count: 0 })
    sessionFrom.mockReturnValue(builder)

    await createSupabaseContentAdapter().list(ctxFor(makeType()), {
      sort: { field: 'nope', direction: 'asc' },
    })

    expect(warn).toHaveBeenCalledOnce()
  })
})

describe('anonymous public reads', () => {
  it('uses the session client for a normal request', async () => {
    const { builder } = makeBuilder({ data: [], error: null, count: 0 })
    sessionFrom.mockReturnValue(builder)

    await createSupabaseContentAdapter().list(ctxFor(makeType()), {})

    expect(sessionFrom).toHaveBeenCalledWith('posts')
    expect(anonymousFrom).not.toHaveBeenCalled()
    expect(createClient).not.toHaveBeenCalled()
  })

  it('uses a session-less anon client for a public read, built once', async () => {
    publicRead = true
    const { builder } = makeBuilder({ data: [row], error: null, count: 1 })
    anonymousFrom.mockReturnValue(builder)
    const adapter = createSupabaseContentAdapter()

    await adapter.list(ctxFor(makeType()), {})
    await adapter.get(ctxFor(makeType()), 1)

    expect(sessionFrom).not.toHaveBeenCalled()
    expect(anonymousFrom).toHaveBeenCalledTimes(2)
    expect(createClient).toHaveBeenCalledTimes(1)
    expect(createClient).toHaveBeenCalledWith('https://example.supabase.co', 'anon-key', {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
  })
})
