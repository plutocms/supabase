import type { PlutoContentType } from '@plutocms/core/shared/types/content'
import {
  fieldColumn,
  mapColumnsToFields,
} from '@plutocms/core/shared/utils/content-map'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// The session client and the service client are fakes. A system request (a scheduled task of
// core) must use the service client.
const sessionFrom = vi.fn()
const serviceFrom = vi.fn()
let serviceKey = true

vi.mock('#supabase/server', () => ({
  serverSupabaseClient: vi.fn(async () => ({ from: sessionFrom })),
  serverSupabaseServiceRole: vi.fn(() => {
    if (!serviceKey) {
      throw new Error('no key')
    }
    return { from: serviceFrom }
  }),
}))

vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn() }))

const { createSupabaseContentAdapter, resolveTrashColumn } =
  await import('../server/utils/content-adapter')

/** A chainable stand-in for a PostgREST builder. It records each call and resolves to `result`. */
function makeBuilder(result: {
  data: unknown
  error: unknown
  count?: number
}) {
  const calls: Array<[string, unknown[]]> = []
  const builder: Record<string, unknown> = {
    then: (resolve: (value: unknown) => unknown) => resolve(result),
  }
  for (const name of [
    'select',
    'eq',
    'in',
    'is',
    'not',
    'lt',
    'gte',
    'contains',
    'ilike',
    'order',
    'range',
    'limit',
    'update',
    'delete',
  ]) {
    builder[name] = (...args: unknown[]) => {
      calls.push([name, args])
      return builder
    }
  }
  builder.maybeSingle = async () => result
  return { builder, calls }
}

const SYSTEM = { context: { plutoSystem: true } }

function makeType(overrides: Partial<PlutoContentType> = {}): PlutoContentType {
  return {
    name: 'post',
    label: 'Post',
    labelPlural: 'Posts',
    source: 'posts',
    titleField: 'title',
    trash: true,
    fields: [{ name: 'title', type: 'text' }],
    ...overrides,
  } as PlutoContentType
}

const ctxFor = (type: PlutoContentType, event: unknown = {}) =>
  ({ event, type }) as never

beforeEach(() => {
  serviceKey = true
  vi.stubGlobal('fieldColumn', fieldColumn)
  vi.stubGlobal('mapColumnsToFields', mapColumnsToFields)
  vi.stubGlobal('isPublicRead', () => false)
  vi.stubGlobal(
    'isPlutoSystemEvent',
    (event: { context?: Record<string, unknown> }) =>
      event?.context?.plutoSystem === true
  )
  vi.stubGlobal(
    'createPlutoError',
    (input: { statusCode: number; message: string; key: string }) =>
      Object.assign(new Error(input.message), input)
  )
  vi.stubGlobal('createError', (input: unknown) =>
    Object.assign(new Error('error'), input)
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('the trash column', () => {
  it('is deleted_at, another column, or none', () => {
    expect(resolveTrashColumn(makeType())).toBe('deleted_at')
    expect(resolveTrashColumn(makeType({ trash: { column: 'gone_at' } }))).toBe(
      'gone_at'
    )
    expect(resolveTrashColumn(makeType({ trash: false }))).toBeUndefined()
  })
})

describe('the reads hide a trashed row', () => {
  it('in list, get and countCreated, only for a type with trash', async () => {
    const { builder, calls } = makeBuilder({ data: [], error: null, count: 0 })
    sessionFrom.mockReturnValue(builder)
    const adapter = createSupabaseContentAdapter()

    await adapter.list(ctxFor(makeType()), {})
    await adapter.get(ctxFor(makeType()), 1)
    await adapter.countCreated!(ctxFor(makeType()), { from: 'a', to: 'b' })
    const withTrash = calls.filter(([name]) => name === 'is').length
    expect(calls).toContainEqual(['is', ['deleted_at', null]])

    calls.length = 0
    await adapter.list(ctxFor(makeType({ trash: false })), {})

    expect(withTrash).toBe(3)
    expect(calls.some(([name]) => name === 'is')).toBe(false)
  })
})

describe('the trash methods', () => {
  it('moves a live row to the trash, and answers 404 when none moved', async () => {
    const moved = makeBuilder({ data: [{ id: 1 }], error: null })
    sessionFrom.mockReturnValueOnce(moved.builder)
    const adapter = createSupabaseContentAdapter()

    await adapter.trash!.move(ctxFor(makeType()), 1)

    const update = moved.calls.find(([name]) => name === 'update')!
    expect(Object.keys(update[1][0] as object)).toEqual(['deleted_at'])
    expect(moved.calls).toContainEqual(['eq', ['id', 1]])
    expect(moved.calls).toContainEqual(['is', ['deleted_at', null]])

    sessionFrom.mockReturnValueOnce(
      makeBuilder({ data: [], error: null }).builder
    )
    await expect(
      adapter.trash!.move(ctxFor(makeType()), 2)
    ).rejects.toMatchObject({ statusCode: 404 })
  })

  it('lists the trash, the last trashed first, with _deletedAt', async () => {
    const { builder, calls } = makeBuilder({
      data: [{ id: 3, title: 'Gone', deleted_at: '2026-05-01T00:00:00Z' }],
      error: null,
      count: 1,
    })
    sessionFrom.mockReturnValue(builder)

    const result = await createSupabaseContentAdapter().trash!.list(
      ctxFor(makeType()),
      { limit: 10, offset: 5, search: 'go' }
    )

    expect(result).toEqual({
      data: [{ id: 3, title: 'Gone', _deletedAt: '2026-05-01T00:00:00Z' }],
      total: 1,
    })
    expect(calls).toContainEqual(['not', ['deleted_at', 'is', null]])
    expect(calls).toContainEqual(['ilike', ['title', '%go%']])
    expect(calls).toContainEqual([
      'order',
      ['deleted_at', { ascending: false }],
    ])
    expect(calls).toContainEqual(['range', [5, 14]])
  })

  it('restores only a trashed row', async () => {
    const restored = makeBuilder({
      data: [{ id: 1, title: 'Back' }],
      error: null,
    })
    sessionFrom.mockReturnValueOnce(restored.builder)
    const adapter = createSupabaseContentAdapter()

    expect(await adapter.trash!.restore(ctxFor(makeType()), 1)).toMatchObject({
      id: 1,
      title: 'Back',
    })
    expect(restored.calls).toContainEqual(['update', [{ deleted_at: null }]])
    expect(restored.calls).toContainEqual(['not', ['deleted_at', 'is', null]])

    sessionFrom.mockReturnValueOnce(
      makeBuilder({ data: [], error: null }).builder
    )
    await expect(
      adapter.trash!.restore(ctxFor(makeType()), 9)
    ).rejects.toMatchObject({ statusCode: 404 })
  })

  it('purges only a trashed row, and its revisions', async () => {
    const purged = makeBuilder({ data: [{ id: 1 }], error: null })
    const revisions = makeBuilder({ data: null, error: null })
    sessionFrom
      .mockReturnValueOnce(purged.builder)
      .mockReturnValueOnce(revisions.builder)

    await createSupabaseContentAdapter().trash!.purge(ctxFor(makeType()), 1)

    expect(purged.calls.map(([name]) => name)).toContain('delete')
    expect(purged.calls).toContainEqual(['not', ['deleted_at', 'is', null]])
    expect(sessionFrom).toHaveBeenNthCalledWith(2, 'pluto_content_revisions')
  })

  it('purges the rows trashed before a time with the service client in a system request', async () => {
    const purged = makeBuilder({ data: [{ id: 1 }, { id: 2 }], error: null })
    const revisions = makeBuilder({ data: null, error: null })
    serviceFrom
      .mockReturnValueOnce(purged.builder)
      .mockReturnValue(revisions.builder)

    const count = await createSupabaseContentAdapter().trash!.purgeBefore(
      ctxFor(makeType(), SYSTEM),
      '2026-04-01T00:00:00.000Z'
    )

    expect(count).toBe(2)
    expect(purged.calls).toContainEqual([
      'lt',
      ['deleted_at', '2026-04-01T00:00:00.000Z'],
    ])
    expect(sessionFrom).not.toHaveBeenCalled()
  })

  it('answers 401 for a system request with no service key', async () => {
    serviceKey = false
    await expect(
      createSupabaseContentAdapter().trash!.purgeBefore(
        ctxFor(makeType(), SYSTEM),
        '2026-04-01T00:00:00.000Z'
      )
    ).rejects.toMatchObject({ statusCode: 401 })
  })

  it('answers 404 for a type with no trash', async () => {
    await expect(
      createSupabaseContentAdapter().trash!.list(
        ctxFor(makeType({ trash: false })),
        {}
      )
    ).rejects.toMatchObject({ statusCode: 404 })
  })
})
