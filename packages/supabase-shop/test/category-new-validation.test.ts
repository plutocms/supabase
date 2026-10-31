import { defineEventHandler } from 'h3'
import { describe, expect, it, vi } from 'vitest'

// server/api/_pluto/shop/categories.post.ts imports `serverSupabaseClient` from
// '#supabase/server', a virtual module Nitro only resolves inside a real
// Nuxt build, and calls the auto-imported `defineEventHandler` at module
// load time. Stubbed here so the module can load under plain `vitest run`,
// matching the pattern test/reconcile-product-media.test.ts uses for the
// same '#supabase/server' import. Neither stub ever runs in this test: it
// only checks the exported schema, never invokes the route handler itself.
vi.mock('#supabase/server', () => ({ serverSupabaseClient: vi.fn() }))
vi.stubGlobal('defineEventHandler', defineEventHandler)

const { newCategoryPayloadSchema } =
  await import('../server/api/_pluto/shop/categories.post')

describe('newCategoryPayloadSchema', () => {
  it('accepts a slug and label, with description optional', () => {
    const result = newCategoryPayloadSchema.safeParse({
      slug: 'shoes',
      label: 'Shoes',
    })

    expect(result.success).toBe(true)
    expect(result.data).toEqual({ slug: 'shoes', label: 'Shoes' })
  })

  it('accepts a description when given', () => {
    const result = newCategoryPayloadSchema.safeParse({
      slug: 'shoes',
      label: 'Shoes',
      description: 'Footwear',
    })

    expect(result.success).toBe(true)
    expect(result.data?.description).toBe('Footwear')
  })

  it('rejects a missing slug', () => {
    const result = newCategoryPayloadSchema.safeParse({ label: 'Shoes' })

    expect(result.success).toBe(false)
  })

  it('rejects an empty slug', () => {
    const result = newCategoryPayloadSchema.safeParse({
      slug: '  ',
      label: 'Shoes',
    })

    expect(result.success).toBe(false)
  })

  it('rejects a missing label', () => {
    const result = newCategoryPayloadSchema.safeParse({ slug: 'shoes' })

    expect(result.success).toBe(false)
  })

  it('rejects an empty label', () => {
    const result = newCategoryPayloadSchema.safeParse({
      slug: 'shoes',
      label: '',
    })

    expect(result.success).toBe(false)
  })

  it('rejects a non-string description', () => {
    const result = newCategoryPayloadSchema.safeParse({
      slug: 'shoes',
      label: 'Shoes',
      description: 42,
    })

    expect(result.success).toBe(false)
  })

  it('trims a slug and label with surrounding whitespace', () => {
    const result = newCategoryPayloadSchema.safeParse({
      slug: '  shoes  ',
      label: '  Shoes  ',
    })

    expect(result.success).toBe(true)
    expect(result.data).toEqual({ slug: 'shoes', label: 'Shoes' })
  })
})
