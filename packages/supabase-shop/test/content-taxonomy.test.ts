import { readFileSync } from 'node:fs'
import { defineContentType } from '@plutocms/core/shared/utils/content'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// The module calls the auto-imported `defineContentType`. Plain `vitest run`
// has no Nuxt build step, so the test stubs it with the real implementation.
beforeEach(() => {
  vi.stubGlobal('defineContentType', defineContentType)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('taxonomy content types', () => {
  it('the category is public, has no timestamps and no status', async () => {
    const { productCategoryType } =
      await import('../shared/utils/content-taxonomy')

    expect(productCategoryType.name).toBe('product-category')
    expect(productCategoryType.source).toBe('product_category')
    expect(productCategoryType.api?.public).toBe(true)
    expect(productCategoryType.timestamps).toBe(false)
    expect(productCategoryType.status).toBe(false)
    expect(productCategoryType.autoRoutes).toBe(false)
  })

  it('the category writes need shop:manage_taxonomy', async () => {
    const { productCategoryType } =
      await import('../shared/utils/content-taxonomy')

    expect(productCategoryType.capabilities).toEqual({
      write: 'shop:manage_taxonomy',
      delete: 'shop:manage_taxonomy',
    })
  })

  it('the availability is public and its writes need a capability that no role has', async () => {
    const { productAvailabilityType } =
      await import('../shared/utils/content-taxonomy')

    expect(productAvailabilityType.name).toBe('product-availability')
    expect(productAvailabilityType.source).toBe('product_availability')
    expect(productAvailabilityType.api?.public).toBe(true)
    expect(productAvailabilityType.timestamps).toBe(false)
    expect(productAvailabilityType.capabilities?.write).toBe(
      'shop:manage_availability'
    )
    expect(productAvailabilityType.capabilities?.delete).toBe(
      'shop:manage_availability'
    )
  })

  it('every public field names a declared field', async () => {
    const { productCategoryType, productAvailabilityType } =
      await import('../shared/utils/content-taxonomy')

    for (const type of [productCategoryType, productAvailabilityType]) {
      const names = type.fields.map((field) => field.name)
      for (const name of type.api?.fields ?? []) {
        expect(names).toContain(name)
      }
    }
  })

  it('defines with no console warnings', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await import('../shared/utils/content-taxonomy')

    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('the layer does not register the taxonomies on the client', () => {
    const source = readFileSync(
      new URL('../app/plugins/pluto-extension.ts', import.meta.url),
      'utf8'
    )

    expect(source).not.toContain('productCategoryType')
    expect(source).not.toContain('productAvailabilityType')
  })

  it('the server plugin registers both taxonomies and the product hook', () => {
    const source = readFileSync(
      new URL('../server/plugins/content.ts', import.meta.url),
      'utf8'
    )

    expect(source).toContain('registerContentType(productCategoryType)')
    expect(source).toContain('registerContentType(productAvailabilityType)')
    expect(source).toContain('toPublic: productToPublic')
  })
})
