import type { PlutoContentType } from '@plutocms/core/shared/types/content'
import { afterEach, describe, expect, it, vi } from 'vitest'

const user = vi.fn(async () => ({ sub: 'u1', email: 'ada@example.com' }))

vi.mock('#supabase/server', () => ({
  serverSupabaseUser: () => user(),
}))

const {
  deleteRevisions,
  getItemRevision,
  listItemRevisions,
  MAX_REVISIONS_PER_ITEM,
  recordRevision,
  updateAction,
} = await import('../server/utils/content-revisions')

const type = {
  name: 'post',
  label: 'Post',
  labelPlural: 'Posts',
  source: 'posts',
  titleField: 'title',
  fields: [{ name: 'title', type: 'text', label: 'Title' }],
  status: { column: 'status', default: 'draft', publishedValue: 'published', values: [] },
  capabilities: { write: 'posts:publish' },
} as PlutoContentType

const ctx = { event: {}, type } as never

/** A fake client: each `from(table)` call takes the next answer, and records its calls. */
function fakeClient(answers: Record<string, unknown[]>) {
  const calls: Array<{ table: string; op: string; args: unknown[] }> = []
  const queues = Object.fromEntries(
    Object.entries(answers).map(([table, list]) => [table, [...list]])
  )
  const client = {
    from(table: string) {
      const result = queues[table]?.shift() ?? { data: null, error: null }
      const builder: Record<string, unknown> = {
        then: (resolve: (value: unknown) => unknown) => resolve(result),
        maybeSingle: async () => result,
      }
      for (const op of ['select', 'insert', 'delete', 'eq', 'in', 'lt', 'order', 'range', 'limit']) {
        builder[op] = (...args: unknown[]) => {
          calls.push({ table, op, args })
          return builder
        }
      }
      return builder
    },
  }
  return { client: client as never, calls }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('updateAction', () => {
  it('names a publish and an unpublish, else an update', () => {
    expect(updateAction(type, 'draft', 'published')).toBe('publish')
    expect(updateAction(type, 'published', 'draft')).toBe('unpublish')
    expect(updateAction(type, 'published', 'published')).toBe('update')
    expect(updateAction(type, 'draft', undefined)).toBe('update')
    expect(updateAction({ ...type, status: false }, 'a', 'b')).toBe('update')
  })
})

describe('recordRevision', () => {
  it('writes the item with the author, the action and the write capability', async () => {
    const { client, calls } = fakeClient({
      profiles: [{ data: { display_name: 'Ada', username: null, email: null }, error: null }],
      pluto_content_revisions: [{ error: null }, { data: [], error: null }],
    })

    await recordRevision(ctx, client, { id: 7, title: 'Hello' }, 'publish')

    const insert = calls.find((call) => call.op === 'insert')!
    expect(insert.args[0]).toEqual({
      type: 'post',
      item_id: '7',
      action: 'publish',
      data: { id: 7, title: 'Hello' },
      author_id: 'u1',
      author_name: 'Ada',
      capability: 'posts:publish',
    })
    expect(calls).toContainEqual({
      table: 'pluto_content_revisions',
      op: 'range',
      args: [MAX_REVISIONS_PER_ITEM, MAX_REVISIONS_PER_ITEM + 99],
    })
    expect(calls.some((call) => call.op === 'delete')).toBe(false)
  })

  it('deletes the revisions above the limit', async () => {
    const { client, calls } = fakeClient({
      profiles: [{ data: null, error: null }],
      pluto_content_revisions: [
        { error: null },
        { data: [{ id: 3 }, { id: 2 }], error: null },
        { error: null },
      ],
    })

    await recordRevision(ctx, client, { id: 7 }, 'update')

    expect(calls.find((call) => call.op === 'insert')!.args[0]).toMatchObject({
      author_name: 'ada@example.com',
    })
    expect(calls).toContainEqual({
      table: 'pluto_content_revisions',
      op: 'in',
      args: ['id', [3, 2]],
    })
  })

  it('never throws: a failed write only warns', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { client } = fakeClient({
      pluto_content_revisions: [{ error: { message: 'relation does not exist' } }],
    })

    await expect(
      recordRevision(ctx, client, { id: 7 }, 'update')
    ).resolves.toBeUndefined()
    expect(warn.mock.calls[0]?.[0]).toContain('relation does not exist')
  })

  it('writes nothing without a signed-in user', async () => {
    user.mockResolvedValueOnce(null as never)
    const { client, calls } = fakeClient({})

    await recordRevision(ctx, client, { id: 7 }, 'update')

    expect(calls).toEqual([])
  })
})

describe('listItemRevisions', () => {
  it('lists newest first, with a keyset cursor when there are more', async () => {
    const { client, calls } = fakeClient({
      pluto_content_revisions: [
        {
          data: [
            { id: 9, created_at: '2026-11-03T10:00:00Z', action: 'publish', author_name: 'Ada' },
            { id: 8, created_at: '2026-11-02T10:00:00Z', action: null, author_name: null },
            { id: 5, created_at: '2026-11-01T10:00:00Z', action: 'create', author_name: 'Ada' },
          ],
          error: null,
        },
      ],
    })

    const page = await listItemRevisions(ctx, client, 7, { limit: 2, cursor: '12' })

    expect(page).toEqual({
      data: [
        { id: '9', createdAt: '2026-11-03T10:00:00Z', author: { name: 'Ada' }, action: 'publish' },
        { id: '8', createdAt: '2026-11-02T10:00:00Z' },
      ],
      nextCursor: '8',
    })
    expect(calls).toContainEqual({ table: 'pluto_content_revisions', op: 'limit', args: [3] })
    expect(calls).toContainEqual({ table: 'pluto_content_revisions', op: 'lt', args: ['id', 12] })
    expect(calls).toContainEqual({ table: 'pluto_content_revisions', op: 'eq', args: ['item_id', '7'] })
  })

  it('ignores a cursor that is not a number', async () => {
    const { client, calls } = fakeClient({ pluto_content_revisions: [{ data: [], error: null }] })

    expect(await listItemRevisions(ctx, client, 7, { limit: 5, cursor: 'x' })).toEqual({ data: [] })
    expect(calls.some((call) => call.op === 'lt')).toBe(false)
  })
})

describe('getItemRevision', () => {
  it('gives the stored item, and null for an unknown or bad revision id', async () => {
    const { client } = fakeClient({
      pluto_content_revisions: [
        { data: { data: { id: 7, title: 'Old' } }, error: null },
        { data: null, error: null },
      ],
    })

    expect(await getItemRevision(ctx, client, 7, '5')).toEqual({ id: 7, title: 'Old' })
    expect(await getItemRevision(ctx, client, 7, '6')).toBeNull()
    expect(await getItemRevision(ctx, client, 7, 'abc')).toBeNull()
  })
})

describe('deleteRevisions', () => {
  it('deletes the revisions of the item', async () => {
    const { client, calls } = fakeClient({ pluto_content_revisions: [{ error: null }] })

    await deleteRevisions(ctx, client, 7)

    expect(calls).toEqual([
      { table: 'pluto_content_revisions', op: 'delete', args: [] },
      { table: 'pluto_content_revisions', op: 'eq', args: ['type', 'post'] },
      { table: 'pluto_content_revisions', op: 'eq', args: ['item_id', '7'] },
    ])
  })
})
