import { defineContentType } from '@plutocms/core/shared/utils/content'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// shared/utils/content-post.ts calls the auto-imported `defineContentType` with
// no explicit import, the same way every file in this layer relies on
// Nuxt's cross-layer shared/utils auto-import (see `definePlutoExtension`
// in app/plugins/pluto-extension.ts for the same pattern). Plain
// `vitest run` has no Nuxt build step, so it never injects that global —
// stub it with the real implementation before the module loads, the same
// way test/nuxt-config.test.ts stubs `defineNuxtConfig`.
beforeEach(() => {
  vi.stubGlobal('defineContentType', defineContentType)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('postType', () => {
  it('titleField names a real field', async () => {
    const { postType } = await import('../shared/utils/content-post')

    expect(
      postType.fields.some((field) => field.name === postType.titleField)
    ).toBe(true)
  })

  it('slug.field names a field of type "slug"', async () => {
    const { postType } = await import('../shared/utils/content-post')

    expect(postType.slug).not.toBe(false)

    const slug = postType.slug as { field: string }
    const field = postType.fields.find(
      (candidate) => candidate.name === slug.field
    )

    expect(field?.type).toBe('slug')
  })

  it('has no duplicate field names', async () => {
    const { postType } = await import('../shared/utils/content-post')

    const names = postType.fields.map((field) => field.name)

    expect(new Set(names).size).toBe(names.length)
  })

  it('declares a non-empty status.values list', async () => {
    const { postType } = await import('../shared/utils/content-post')

    expect(postType.status).not.toBe(false)

    const status = postType.status as { values: unknown[] }

    expect(status.values.length).toBeGreaterThan(0)
  })

  it('asks for both admin bar buttons', async () => {
    const { postType } = await import('../shared/utils/content-post')

    expect(postType.adminBar).toBe(true)
  })

  it('defines with no console warnings', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await import('../shared/utils/content-post')

    expect(warn).not.toHaveBeenCalled()

    warn.mockRestore()
  })
})
