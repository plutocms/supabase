import type { PlutoContentType } from '@plutocms/core/shared/types/content'
import {
  fieldColumn,
  mapColumnsToFields,
  mapFieldsToColumns,
} from '@plutocms/core/shared/utils/content-map'
import * as status from '@plutocms/core/shared/utils/content-status'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Scheduled publish and review on the Supabase adapter. The session client and the service client
// are fakes; the capability check is a mock.
const sessionFrom = vi.fn()
const serviceFrom = vi.fn()
const requireCapability = vi.fn(async () => {})

vi.mock('#supabase/server', () => ({
  serverSupabaseClient: vi.fn(async () => ({ from: sessionFrom })),
  serverSupabaseServiceRole: vi.fn(() => ({ from: serviceFrom })),
}))
vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn() }))
vi.mock('../server/utils/capability-guard', () => ({
  requireCapability: (...args: unknown[]) => requireCapability(...args),
}))

const { createSupabaseContentAdapter } =
  await import('../server/utils/content-adapter')

/** A chainable stand-in for a PostgREST builder. It records each call and resolves to `result`. */
function makeBuilder(result: { data: unknown; error: unknown; count?: number }) {
  const calls: Array<[string, unknown[]]> = []
  const builder: Record<string, unknown> = {
    then: (resolve: (value: unknown) => unknown) => resolve(result),
  }
  for (const name of [
    'select',
    'eq',
    'in',
    'is',
    'or',
    'lt',
    'lte',
    'contains',
    'ilike',
    'order',
    'range',
    'limit',
    'insert',
    'update',
    'delete',
  ]) {
    builder[name] = (...args: unknown[]) => {
      calls.push([name, args])
      return builder
    }
  }
  builder.maybeSingle = async () => result
  builder.single = async () => result
  return { builder, calls }
}

const SYSTEM = { context: { plutoSystem: true } }

/**
 * The session client answers the `posts` builders in order; every other table (the revisions,
 * the profile of the author) gets an empty answer.
 */
function postsAnswer(...builders: Array<Record<string, unknown>>) {
  sessionFrom.mockImplementation((table: string) =>
    table === 'posts'
      ? builders.shift()
      : makeBuilder({ data: null, error: null }).builder
  )
}

function makeType(overrides: Partial<PlutoContentType> = {}): PlutoContentType {
  return {
    name: 'post',
    label: 'Post',
    labelPlural: 'Posts',
    source: 'posts',
    titleField: 'title',
    fields: [{ name: 'title', type: 'text' }],
    status: {
      column: 'status',
      default: 'draft',
      publishedValue: 'published',
      publishedAtColumn: 'published_at',
      values: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
      ],
      schedule: true,
      review: true,
    },
    capabilities: { write: 'posts:write', publish: 'posts:publish' },
    timestamps: { created: false, updated: false },
    ...overrides,
  } as PlutoContentType
}

const ctxFor = (type: PlutoContentType, event: unknown = {}) =>
  ({ event, type }) as never

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-05-01T12:00:00Z'))
  for (const [name, value] of Object.entries({
    fieldColumn,
    mapColumnsToFields,
    mapFieldsToColumns,
    ...status,
  })) {
    vi.stubGlobal(name, value)
  }
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
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.resetAllMocks()
  requireCapability.mockImplementation(async () => {})
})

describe('the live rule in list', () => {
  it('reads published, or scheduled with a time that has come', async () => {
    const { builder, calls } = makeBuilder({ data: [], error: null, count: 0 })
    sessionFrom.mockReturnValue(builder)

    await createSupabaseContentAdapter().list(ctxFor(makeType()), {})

    expect(calls).toContainEqual([
      'or',
      [
        'status.eq.published,and(status.eq.scheduled,published_at.lte."2026-05-01T12:00:00.000Z")',
      ],
    ])
  })

  it('keeps the equality for a type with no schedule', async () => {
    const { builder, calls } = makeBuilder({ data: [], error: null, count: 0 })
    sessionFrom.mockReturnValue(builder)
    const type = makeType()
    const plain = makeType({
      status: { ...(type.status as object), schedule: false } as never,
    })

    await createSupabaseContentAdapter().list(ctxFor(plain), {})

    expect(calls).toContainEqual(['eq', ['status', 'published']])
    expect(calls.some(([name]) => name === 'or')).toBe(false)
  })
})

describe('the publish time', () => {
  it('stamps a post that is created as published, and sets the planned time of a schedule', async () => {
    const published = makeBuilder({ data: { id: 1 }, error: null })
    const scheduled = makeBuilder({ data: { id: 2 }, error: null })
    postsAnswer(published.builder, scheduled.builder)
    const adapter = createSupabaseContentAdapter()

    await adapter.create(ctxFor(makeType()), {
      title: 'A',
      status: 'published',
    })
    await adapter.create(ctxFor(makeType()), {
      title: 'B',
      status: 'scheduled',
      publishAt: '2026-05-02T09:00:00Z',
    })

    expect(published.calls.find(([name]) => name === 'insert')![1][0]).toMatchObject({
      status: 'published',
      published_at: '2026-05-01T12:00:00.000Z',
    })
    const row = scheduled.calls.find(([name]) => name === 'insert')![1][0]
    expect(row).toMatchObject({
      status: 'scheduled',
      published_at: '2026-05-02T09:00:00.000Z',
    })
    expect(row).not.toHaveProperty('publishAt')
    expect(requireCapability).toHaveBeenCalledWith({}, 'posts:publish')
  })

  it('refuses a schedule in the past with 400', async () => {
    await expect(
      createSupabaseContentAdapter().create(ctxFor(makeType()), {
        title: 'B',
        status: 'scheduled',
        publishAt: '2026-04-01T00:00:00Z',
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      key: 'pluto.errors.scheduleInPast',
    })
  })

  it('clears the time of an unscheduled post, and stamps Publish now', async () => {
    const stored = { id: 1, status: 'scheduled', published_at: '2026-05-09T00:00:00Z' }
    const draft = makeBuilder({ data: { ...stored, status: 'draft' }, error: null })
    const live = makeBuilder({ data: { ...stored, status: 'published' }, error: null })
    postsAnswer(
      makeBuilder({ data: stored, error: null }).builder,
      draft.builder,
      makeBuilder({ data: stored, error: null }).builder,
      live.builder
    )
    const adapter = createSupabaseContentAdapter()

    await adapter.update(ctxFor(makeType()), 1, { status: 'draft' })
    await adapter.update(ctxFor(makeType()), 1, { status: 'published' })

    expect(draft.calls.find(([name]) => name === 'update')![1][0]).toMatchObject({
      status: 'draft',
      published_at: null,
    })
    expect(live.calls.find(([name]) => name === 'update')![1][0]).toMatchObject({
      status: 'published',
      published_at: '2026-05-01T12:00:00.000Z',
    })
  })
})

describe('the publish capability', () => {
  it('checks publish when a writer changes a published post, even with no status in the payload', async () => {
    requireCapability.mockRejectedValueOnce(
      Object.assign(new Error('no'), { statusCode: 403 })
    )
    postsAnswer(
      makeBuilder({ data: { id: 1, status: 'published' }, error: null }).builder
    )

    await expect(
      createSupabaseContentAdapter().update(ctxFor(makeType()), 1, {
        title: 'Changed',
      })
    ).rejects.toMatchObject({ statusCode: 403 })
    expect(requireCapability).toHaveBeenCalledWith({}, 'posts:publish')
  })

  it('lets a writer send a draft to review with no publish check', async () => {
    postsAnswer(
      makeBuilder({ data: { id: 1, status: 'draft' }, error: null }).builder,
      makeBuilder({ data: { id: 1, status: 'review' }, error: null }).builder
    )

    const item = await createSupabaseContentAdapter().update(
      ctxFor(makeType()),
      1,
      { status: 'review' }
    )

    expect(item.status).toBe('review')
    expect(requireCapability).not.toHaveBeenCalled()
  })
})

describe('publishDue', () => {
  it('publishes the due scheduled rows that are not trashed, with the service client in a system request', async () => {
    const { builder, calls } = makeBuilder({
      data: [{ id: 1 }, { id: 2 }],
      error: null,
    })
    serviceFrom.mockReturnValueOnce(builder)

    const count = await createSupabaseContentAdapter().publishDue!(
      ctxFor(makeType({ trash: true }), SYSTEM),
      '2026-05-01T12:00:00.000Z'
    )

    expect(count).toBe(2)
    expect(calls).toEqual([
      ['update', [{ status: 'published' }]],
      ['eq', ['status', 'scheduled']],
      ['lte', ['published_at', '2026-05-01T12:00:00.000Z']],
      ['is', ['deleted_at', null]],
      ['select', ['id']],
    ])
    expect(sessionFrom).not.toHaveBeenCalled()
  })

  it('does nothing for a type with no schedule', async () => {
    const type = makeType()
    expect(
      await createSupabaseContentAdapter().publishDue!(
        ctxFor(
          makeType({
            status: { ...(type.status as object), schedule: false } as never,
          })
        ),
        '2026-05-01T12:00:00.000Z'
      )
    ).toBe(0)
  })
})
