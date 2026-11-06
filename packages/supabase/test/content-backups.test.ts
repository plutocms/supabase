import type { PlutoContentType } from '@plutocms/core/shared/types/content'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const user = vi.fn(async (): Promise<{ sub: string } | null> => ({
  sub: 'u1',
}))

vi.mock('#supabase/server', () => ({
  serverSupabaseUser: () => user(),
}))

const {
  BACKUP_TTL_DAYS,
  getBackup,
  isMissingTable,
  MAX_BACKUPS_PER_USER,
  putBackup,
  removeBackup,
  resetMissingTableWarning,
} = await import('../server/utils/content-backups')

const type = {
  name: 'post',
  label: 'Post',
  labelPlural: 'Posts',
  source: 'posts',
  titleField: 'title',
  fields: [{ name: 'title', type: 'text', label: 'Title' }],
} as PlutoContentType

const ctx = { event: {}, type } as never

const record = {
  v: 1,
  savedAt: Date.parse('2026-11-06T10:00:00Z'),
  device: 'dev-a',
  tab: 'tab-1',
  changes: { title: { base: 'a', value: 'b' } },
} as never

/** A fake client: each `from(table)` call takes the next answer, and records its calls. */
function fakeClient(answers: unknown[]) {
  const calls: Array<{ op: string; args: unknown[] }> = []
  const queue = [...answers]
  const client = {
    from(table: string) {
      calls.push({ op: 'from', args: [table] })
      const result = queue.shift() ?? { data: null, error: null }
      const builder: Record<string, unknown> = {
        then: (resolve: (value: unknown) => unknown) => resolve(result),
        maybeSingle: async () => result,
      }
      for (const op of [
        'select',
        'insert',
        'upsert',
        'delete',
        'eq',
        'in',
        'lt',
        'order',
        'range',
      ]) {
        builder[op] = (...args: unknown[]) => {
          calls.push({ op, args })
          return builder
        }
      }
      return builder
    },
  }
  return { client: client as never, calls }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-06T12:00:00Z'))
  user.mockImplementation(async () => ({ sub: 'u1' }))
  resetMissingTableWarning()
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('isMissingTable', () => {
  it('knows the Postgres and PostgREST codes', () => {
    expect(isMissingTable({ code: '42P01' })).toBe(true)
    expect(isMissingTable({ code: 'PGRST205' })).toBe(true)
    expect(isMissingTable({ code: '23505' })).toBe(false)
    expect(isMissingTable(null)).toBe(false)
  })
})

describe('getBackup', () => {
  it('deletes the expired copies of the user, then returns the record', async () => {
    const { client, calls } = fakeClient([
      { error: null },
      { data: { record }, error: null },
    ])

    await expect(getBackup(ctx, client, '7')).resolves.toBe(record)

    const lt = calls.find((call) => call.op === 'lt')!
    expect(lt.args[0]).toBe('updated_at')
    expect(lt.args[1]).toBe(
      new Date(Date.now() - BACKUP_TTL_DAYS * 86_400_000).toISOString()
    )
    expect(calls.some((call) => call.op === 'delete')).toBe(true)
    expect(calls).toContainEqual({ op: 'eq', args: ['user_id', 'u1'] })
    expect(calls).toContainEqual({ op: 'eq', args: ['type', 'post'] })
    expect(calls).toContainEqual({ op: 'eq', args: ['item_key', '7'] })
  })

  it('returns null when there is no row', async () => {
    const { client } = fakeClient([
      { error: null },
      { data: null, error: null },
    ])
    await expect(getBackup(ctx, client, '+new')).resolves.toBeNull()
  })

  it('returns null and calls nothing without a user', async () => {
    user.mockImplementation(async () => null)
    const { client, calls } = fakeClient([])
    await expect(getBackup(ctx, client, '7')).resolves.toBeNull()
    expect(calls).toEqual([])
  })

  it('returns null and warns one time when the table is missing', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const missing = { error: { code: '42P01', message: 'no table' } }
    const { client } = fakeClient([missing, missing])

    await expect(getBackup(ctx, client, '7')).resolves.toBeNull()
    await expect(getBackup(ctx, client, '7')).resolves.toBeNull()
    expect(warn).toHaveBeenCalledTimes(1)
  })

  it('throws any other error', async () => {
    const { client } = fakeClient([{ error: { code: '500', message: 'boom' } }])
    await expect(getBackup(ctx, client, '7')).rejects.toMatchObject({
      message: 'boom',
    })
  })
})

describe('putBackup', () => {
  it('upserts the row of the user on the unique key', async () => {
    const { client, calls } = fakeClient([
      { data: null, error: null }, // the current row
      { error: null }, // the upsert
      { error: null }, // the expired delete
      { data: [], error: null }, // the old rows
    ])

    await expect(putBackup(ctx, client, '7', record)).resolves.toEqual({
      otherDevice: false,
    })

    const upsert = calls.find((call) => call.op === 'upsert')!
    expect(upsert.args[0]).toEqual({
      user_id: 'u1',
      type: 'post',
      item_key: '7',
      device: 'dev-a',
      saved_at: '2026-11-06T10:00:00.000Z',
      updated_at: '2026-11-06T12:00:00.000Z',
      record,
    })
    expect(upsert.args[1]).toEqual({ onConflict: 'user_id,type,item_key' })
  })

  it('deletes the copies above the newest 20', async () => {
    const { client, calls } = fakeClient([
      { data: null, error: null },
      { error: null },
      { error: null },
      { data: [{ id: 5 }, { id: 6 }], error: null },
      { error: null },
    ])

    await putBackup(ctx, client, '7', record)

    expect(calls).toContainEqual({
      op: 'order',
      args: ['updated_at', { ascending: false }],
    })
    expect(calls).toContainEqual({
      op: 'range',
      args: [MAX_BACKUPS_PER_USER, MAX_BACKUPS_PER_USER + 99],
    })
    expect(calls).toContainEqual({ op: 'in', args: ['id', [5, 6]] })
  })

  it('reports otherDevice for a recent copy of another device', async () => {
    const recent = new Date(Date.now() - 5 * 60_000).toISOString()
    const { client } = fakeClient([
      { data: { device: 'dev-b', updated_at: recent }, error: null },
    ])
    await expect(putBackup(ctx, client, '7', record)).resolves.toEqual({
      otherDevice: true,
    })
  })

  it('does not report otherDevice after 10 minutes or for the same device', async () => {
    const old = new Date(Date.now() - 11 * 60_000).toISOString()
    const recent = new Date(Date.now() - 60_000).toISOString()
    const first = fakeClient([
      { data: { device: 'dev-b', updated_at: old }, error: null },
    ])
    await expect(putBackup(ctx, first.client, '7', record)).resolves.toEqual({
      otherDevice: false,
    })
    const second = fakeClient([
      { data: { device: 'dev-a', updated_at: recent }, error: null },
    ])
    await expect(putBackup(ctx, second.client, '7', record)).resolves.toEqual({
      otherDevice: false,
    })
  })

  it('does nothing without a user', async () => {
    user.mockImplementation(async () => null)
    const { client, calls } = fakeClient([])
    await expect(putBackup(ctx, client, '7', record)).resolves.toEqual({
      otherDevice: false,
    })
    expect(calls).toEqual([])
  })

  it('does nothing and warns one time when the table is missing', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const missing = { error: { code: 'PGRST205', message: 'no table' } }
    const { client, calls } = fakeClient([missing, missing])

    await expect(putBackup(ctx, client, '7', record)).resolves.toEqual({
      otherDevice: false,
    })
    await expect(putBackup(ctx, client, '7', record)).resolves.toEqual({
      otherDevice: false,
    })
    expect(calls.some((call) => call.op === 'upsert')).toBe(false)
    expect(warn).toHaveBeenCalledTimes(1)
  })

  it('does not fail when the cleanup fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { client } = fakeClient([
      { data: null, error: null },
      { error: null },
      { error: { message: 'denied' } },
      { data: null, error: { message: 'denied' } },
    ])
    await expect(putBackup(ctx, client, '7', record)).resolves.toEqual({
      otherDevice: false,
    })
    expect(warn).toHaveBeenCalledTimes(2)
  })
})

describe('removeBackup', () => {
  it('deletes the row of the user for the item', async () => {
    const { client, calls } = fakeClient([{ error: null }])
    await removeBackup(ctx, client, '7')
    expect(calls.some((call) => call.op === 'delete')).toBe(true)
    expect(calls).toContainEqual({ op: 'eq', args: ['user_id', 'u1'] })
    expect(calls).toContainEqual({ op: 'eq', args: ['type', 'post'] })
    expect(calls).toContainEqual({ op: 'eq', args: ['item_key', '7'] })
  })

  it('does nothing without a user', async () => {
    user.mockImplementation(async () => null)
    const { client, calls } = fakeClient([])
    await removeBackup(ctx, client, '7')
    expect(calls).toEqual([])
  })

  it('does nothing and warns one time when the table is missing', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const missing = { error: { code: '42P01', message: 'no table' } }
    const { client } = fakeClient([missing, missing])
    await removeBackup(ctx, client, '7')
    await removeBackup(ctx, client, '7')
    expect(warn).toHaveBeenCalledTimes(1)
  })
})
