import type { H3Event } from 'h3'
import { createError } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// product-public.ts imports `serverSupabaseClient` from '#supabase/server',
// a virtual module that only a real Nuxt build resolves. It also uses the
// auto-imported `createPlutoError`. Both are stubbed here, as the other
// server tests of this layer do.
const state = vi.hoisted(() => ({
  client: undefined as unknown,
}))

vi.mock('#supabase/server', () => ({
  serverSupabaseClient: vi.fn(async () => state.client),
}))

vi.stubGlobal(
  'createPlutoError',
  (options: { statusCode: number; message: string; key: string }) =>
    createError({
      statusCode: options.statusCode,
      statusMessage: options.message,
      data: { i18n: { key: options.key } },
    })
)
const { productToPublic, PRODUCT_RELATIONS_KEY } =
  await import('../server/utils/product-public')

interface Call {
  table: string
  column: string
  ids: unknown[]
}

/** A fake Supabase client. It records each `.in(...)` call and answers from `tables`. */
function makeClient(tables: Record<string, unknown[]>, failTable?: string) {
  const calls: Call[] = []
  const client = {
    calls,
    from(table: string) {
      const query = {
        select: () => query,
        order: () => query,
        in(column: string, ids: unknown[]) {
          calls.push({ table, column, ids })
          return query
        },
        then(resolve: (value: unknown) => void) {
          resolve(
            table === failTable
              ? { data: null, error: { message: 'boom' } }
              : { data: tables[table] ?? [], error: null }
          )
        },
      }
      return query
    },
    storage: {
      from: (bucket: string) => ({
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `https://files.test/${bucket}/${path}` },
        }),
      }),
    },
  }
  return client
}

function makeEvent() {
  return { context: {} } as unknown as H3Event
}

const ctx = (event: H3Event) => ({ event, type: {} }) as never

function product(
  id: number,
  category: number | null,
  availability: number | null
) {
  return { id, name: `P${id}`, slug: `p${id}`, category, availability }
}

const tables = {
  product_category: [{ id: 10, label: 'Chibi', slug: 'chibi' }],
  product_availability: [{ id: 5, label: 'In stock', slug: 'in-stock' }],
}

describe('productToPublic', () => {
  beforeEach(() => {
    state.client = undefined
  })

  it('adds the category and the availability, and leaves media to core', async () => {
    const client = makeClient(tables)
    state.client = client
    const event = makeEvent()
    const items = [product(1, 10, 5), product(2, null, null)]

    const result = await productToPublic(
      ctx(event),
      { id: 1, name: 'P1', category: 10, availability: 5 },
      { view: 'list', item: items[0] as never, batch: items as never }
    )

    expect(result).toEqual({
      id: 1,
      name: 'P1',
      category: { id: 10, label: 'Chibi', slug: 'chibi' },
      availability: { id: 5, label: 'In stock', slug: 'in-stock' },
    })
  })

  it('gives null to a product with no category or availability', async () => {
    state.client = makeClient(tables)
    const event = makeEvent()
    const items = [product(1, 10, 5), product(2, null, null)]

    const result = await productToPublic(
      ctx(event),
      { id: 2, category: null, availability: null },
      { view: 'list', item: items[1] as never, batch: items as never }
    )

    expect(result.category).toBeNull()
    expect(result.availability).toBeNull()
    expect(result).not.toHaveProperty('media')
  })

  it('makes one query per relation for the whole batch', async () => {
    const client = makeClient(tables)
    state.client = client
    const event = makeEvent()
    const items = Array.from({ length: 20 }, (_, index) =>
      product(index + 1, 10, 5)
    )

    await Promise.all(
      items.map((item) =>
        productToPublic(
          ctx(event),
          { id: item.id },
          { view: 'list', item: item as never, batch: items as never }
        )
      )
    )

    expect(client.calls).toHaveLength(2)
    expect(
      client.calls.find((call) => call.table === 'product_category')?.ids
    ).toEqual([10])
    expect(
      client.calls.find((call) => call.table === 'product_availability')?.ids
    ).toEqual([5])
  })

  it('keeps the related rows on the event under the shop key', async () => {
    state.client = makeClient(tables)
    const event = makeEvent()
    const item = product(1, 10, 5)

    await productToPublic(
      ctx(event),
      { id: 1 },
      { view: 'item', item: item as never, batch: [item] as never }
    )

    expect(event.context[PRODUCT_RELATIONS_KEY]).toBeInstanceOf(Promise)
  })

  it('skips the queries of a relation that no product uses', async () => {
    const client = makeClient(tables)
    state.client = client
    const item = product(1, null, null)

    await productToPublic(
      ctx(makeEvent()),
      { id: 1 },
      { view: 'item', item: item as never, batch: [item] as never }
    )

    expect(client.calls).toEqual([])
  })

  it('throws a 500 with an i18n key when a query fails', async () => {
    state.client = makeClient(tables, 'product_category')
    const item = product(1, 10, 5)
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(
      productToPublic(
        ctx(makeEvent()),
        { id: 1 },
        { view: 'item', item: item as never, batch: [item] as never }
      )
    ).rejects.toMatchObject({
      statusCode: 500,
      data: { i18n: { key: 'supabase-shop.errors.productsLoadFailed' } },
    })
  })
})
