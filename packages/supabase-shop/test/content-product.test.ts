import { defineContentType } from '@plutocms/core/shared/utils/content'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// shared/utils/content-product.ts calls the auto-imported `defineContentType`
// with no explicit import, the same way every file in this layer relies
// on Nuxt's cross-layer shared/utils auto-import. Plain `vitest run` has
// no Nuxt build step, so it never injects that global — stub it with the
// real implementation before the module loads, matching
// supabase-blog/test/content-post.test.ts.
beforeEach(() => {
  vi.stubGlobal('defineContentType', defineContentType)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('productType', () => {
  it('titleField names a real field', async () => {
    const { productType } = await import('../shared/utils/content-product')

    expect(
      productType.fields.some((field) => field.name === productType.titleField)
    ).toBe(true)
  })

  it('slug.field names a field of type "slug"', async () => {
    const { productType } = await import('../shared/utils/content-product')

    expect(productType.slug).not.toBe(false)

    const slug = productType.slug as { field: string }
    const field = productType.fields.find(
      (candidate) => candidate.name === slug.field
    )

    expect(field?.type).toBe('slug')
  })

  it('puts the slug last in the side region', async () => {
    const { productType } = await import('../shared/utils/content-product')

    const side = productType.fields.filter((field) => field.region === 'side')
    const last = side.reduce((a, b) =>
      (b.order ?? 0) > (a.order ?? 0) ? b : a
    )

    expect(last.name).toBe('slug')
  })

  it('has no duplicate field names', async () => {
    const { productType } = await import('../shared/utils/content-product')

    const names = productType.fields.map((field) => field.name)

    expect(new Set(names).size).toBe(names.length)
  })

  it('declares no status workflow', async () => {
    const { productType } = await import('../shared/utils/content-product')

    expect(productType.status).toBe(false)
  })

  it('declares no created-timestamp override, and disables updated', async () => {
    const { productType } = await import('../shared/utils/content-product')

    expect(productType.timestamps).toEqual({
      created: 'created_at',
      updated: false,
    })
  })

  it('media: a list of core media ids in its own column, images and 3D models, public', async () => {
    const { productType } = await import('../shared/utils/content-product')

    const media = productType.fields.find((field) => field.name === 'media')

    expect(media).toMatchObject({ type: 'media', multiple: true, accept: ['image/*', 'model/gltf-binary'] })
    expect(media?.virtual).toBeUndefined()
    expect(productType.api?.fields).toContain('media')
  })

  it('every non-virtual field name matches its own column (no column overrides)', async () => {
    const { productType } = await import('../shared/utils/content-product')

    for (const field of productType.fields) {
      if (field.virtual) {
        continue
      }

      expect(field.column).toBeUndefined()
    }
  })

  it('declares write/delete capabilities, but leaves read ungated', async () => {
    const { productType } = await import('../shared/utils/content-product')

    expect(productType.capabilities?.write).toBe('products:manage')
    expect(productType.capabilities?.delete).toBe('products:delete')
    expect(productType.capabilities?.read).toBeUndefined()
  })

  it('asks for both admin bar buttons', async () => {
    const { productType } = await import('../shared/utils/content-product')

    expect(productType.adminBar).toBe(true)
  })

  it('previewUrl links a product to /product/<slug>, and an unsaved one to nothing', async () => {
    const { productType } = await import('../shared/utils/content-product')

    expect(productType.previewUrl?.({ id: 1, slug: 'mug' })).toBe('/product/mug')
    expect(productType.previewUrl?.({ id: 1, slug: '' })).toBeUndefined()
    expect(productType.previewUrl?.({ id: 1 })).toBeUndefined()
  })

  it('defines with no console warnings', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await import('../shared/utils/content-product')

    expect(warn).not.toHaveBeenCalled()

    warn.mockRestore()
  })
})
