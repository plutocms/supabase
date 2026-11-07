import { defineContentType } from '@plutocms/core/shared/utils/content'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

beforeEach(() => {
  vi.stubGlobal('defineContentType', defineContentType)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('the author type', () => {
  it('is a public type over the authors table', async () => {
    const { blogAuthorType } = await import('../shared/utils/content-authors')

    expect(blogAuthorType).toMatchObject({
      name: 'author',
      source: 'authors',
      icon: 'lucide:user-pen',
      navOrder: 230,
      titleField: 'name',
      slug: { field: 'slug' },
      api: { public: true },
      timestamps: { created: 'created_at', updated: 'updated_at' },
      defaultSort: { field: 'name', direction: 'asc' },
      capabilities: { write: 'authors:manage', delete: 'authors:manage' },
    })
    expect(blogAuthorType.status).toBeFalsy()
    expect(blogAuthorType.fields.map((field) => field.name)).toEqual([
      'name',
      'slug',
      'bio',
      'avatar',
    ])
    expect(blogAuthorType.previewUrl?.({ slug: 'ana' })).toBe('/authors/ana')
    expect(blogAuthorType.previewUrl?.({})).toBeUndefined()
  })
})

describe('the post field authors', () => {
  it('points to the author type and the array column, first in the side region', async () => {
    const { postType } = await import('../shared/utils/content-post')
    const names = postType.fields.map((field) => field.name)

    expect(names.indexOf('authors')).toBe(names.indexOf('slug') + 1)
    expect(
      postType.fields.find((field) => field.name === 'authors')
    ).toMatchObject({
      type: 'reference',
      target: 'author',
      multiple: true,
      create: true,
      remember: true,
      publicFields: ['avatar', 'bio'],
      column: 'author_ids',
      region: 'side',
    })
  })
})
