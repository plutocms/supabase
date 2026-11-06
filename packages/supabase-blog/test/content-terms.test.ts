import { defineContentType } from '@plutocms/core/shared/utils/content'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

beforeEach(() => {
  vi.stubGlobal('defineContentType', defineContentType)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('term types', () => {
  it.each([
    ['blogTagType', 'tag', 'tags', 'lucide:tag', 210, '/tags/'],
    [
      'blogCategoryType',
      'category',
      'categories',
      'lucide:folder',
      220,
      '/categories/',
    ],
  ])('%s', async (exportName, name, source, icon, navOrder, path) => {
    const terms = await import('../shared/utils/content-terms')
    const type = (terms as Record<string, PlutoContentType>)[exportName!]!

    expect(type).toMatchObject({
      name,
      source,
      icon,
      navOrder,
      titleField: 'title',
      slug: { field: 'slug' },
      api: { public: true },
      timestamps: { created: 'created_at', updated: 'updated_at' },
      defaultSort: { field: 'title', direction: 'asc' },
      capabilities: { write: 'terms:manage', delete: 'terms:manage' },
    })
    expect(type.status).toBeFalsy()
    expect(type.fields.map((field) => field.name)).toEqual([
      'title',
      'slug',
      'description',
    ])
    expect(type.previewUrl?.({ slug: 'news' })).toBe(`${path}news`)
    expect(type.previewUrl?.({})).toBeUndefined()
  })

  it('lists both types for registration', async () => {
    const { blogTermTypes } = await import('../shared/utils/content-terms')

    expect(blogTermTypes.map((type) => type.name)).toEqual(['tag', 'category'])
  })
})

describe('post term fields', () => {
  it('point to the term types and the array columns', async () => {
    const { postType } = await import('../shared/utils/content-post')
    const names = postType.fields.map((field) => field.name)

    expect(names.indexOf('categories')).toBe(names.indexOf('cover') + 1)
    expect(names.indexOf('tags')).toBe(names.indexOf('categories') + 1)
    expect(
      postType.fields.find((field) => field.name === 'categories')
    ).toMatchObject({
      type: 'reference',
      target: 'category',
      multiple: true,
      create: true,
      column: 'category_ids',
      region: 'side',
    })
    expect(
      postType.fields.find((field) => field.name === 'tags')
    ).toMatchObject({
      type: 'reference',
      target: 'tag',
      multiple: true,
      create: true,
      column: 'tag_ids',
      region: 'side',
    })
  })
})
