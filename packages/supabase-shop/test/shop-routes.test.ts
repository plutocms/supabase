import { createError, defineEventHandler } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// The routes import `serverSupabaseClient` from '#supabase/server' and use
// auto-imported helpers. They are stubbed here, as the other server tests do.
const state = vi.hoisted(() => ({
  client: undefined as unknown,
  param: '' as string,
}))

vi.mock('#supabase/server', () => ({
  serverSupabaseClient: vi.fn(async () => state.client),
}))

vi.stubGlobal('defineEventHandler', defineEventHandler)
vi.stubGlobal('getRouterParam', () => state.param)
vi.stubGlobal(
  'createPlutoError',
  (options: { statusCode: number; message: string; key: string }) =>
    createError({
      statusCode: options.statusCode,
      statusMessage: options.message,
      data: { i18n: { key: options.key } },
    })
)

/** A fake client. Each table answers with its rows, or with an error. */
function makeClient(
  tables: Record<string, { data?: unknown; error?: unknown }>
) {
  const calls: Array<{ table: string; filters: Array<[string, unknown]> }> = []
  return {
    calls,
    from(table: string) {
      const call = { table, filters: [] as Array<[string, unknown]> }
      calls.push(call)
      const answer = tables[table] ?? { data: [] }
      const query = {
        select: () => query,
        order: () => query,
        eq(column: string, value: unknown) {
          call.filters.push([column, value])
          return query
        },
        maybeSingle: async () => ({
          data: answer.data ?? null,
          error: answer.error ?? null,
        }),
        then(resolve: (value: unknown) => void) {
          resolve({ data: answer.data ?? null, error: answer.error ?? null })
        },
      }
      return query
    },
  }
}

const event = {} as never

beforeEach(() => {
  state.client = undefined
  state.param = ''
})

describe('gET /api/_pluto/shop/categories', () => {
  it('answers { data } with the rows', async () => {
    state.client = makeClient({
      product_category: { data: [{ id: 1, label: 'Chibi', slug: 'chibi' }] },
    })
    const { default: handler } =
      await import('../server/api/_pluto/shop/categories.get')

    expect(await handler(event)).toEqual({
      data: [{ id: 1, label: 'Chibi', slug: 'chibi' }],
    })
  })

  it('throws a 500 with an i18n key on a database error', async () => {
    state.client = makeClient({
      product_category: { error: { message: 'boom' } },
    })
    const { default: handler } =
      await import('../server/api/_pluto/shop/categories.get')

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 500,
      data: { i18n: { key: 'supabase-shop.errors.categoriesLoadFailed' } },
    })
  })
})

describe('gET /api/_pluto/shop/availability', () => {
  it('answers { data } with the rows', async () => {
    state.client = makeClient({
      product_availability: {
        data: [{ id: 1, label: 'In stock', slug: 'in-stock' }],
      },
    })
    const { default: handler } =
      await import('../server/api/_pluto/shop/availability.get')

    expect(await handler(event)).toEqual({
      data: [{ id: 1, label: 'In stock', slug: 'in-stock' }],
    })
  })
})
