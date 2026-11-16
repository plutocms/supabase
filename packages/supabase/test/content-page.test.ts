import { definePlutoPageType } from '@plutocms/core/shared/utils/page-type'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

beforeEach(() => {
  vi.stubGlobal('definePlutoPageType', definePlutoPageType)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

async function pageType() {
  const { supabasePageType } = await import('../shared/utils/content-page')

  return supabasePageType
}

describe('the page type of the Supabase layer', () => {
  it('is the definition of core with the storage of the pages table', async () => {
    const supabasePageType = await pageType()

    expect(supabasePageType).toMatchObject({
      name: 'page',
      source: 'pages',
      api: { public: true },
      trash: true,
      timestamps: { created: 'created_at', updated: 'updated_at' },
    })
    expect(supabasePageType.files).toBeUndefined()
    expect(supabasePageType.fields.map((field) => field.name)).toEqual([
      'title',
      'slug',
      'description',
      'layout',
      'body',
    ])
    expect(
      supabasePageType.fields.find((field) => field.name === 'body')
    ).toMatchObject({ type: 'richtext', widget: 'blocks' })
  })

  it('has the status columns of the migration, with schedule and review', async () => {
    const supabasePageType = await pageType()

    expect(supabasePageType.status).toMatchObject({
      column: 'status',
      publishedAtColumn: 'published_at',
      schedule: true,
      review: true,
    })
  })

  it('names the capabilities of the migration', async () => {
    const supabasePageType = await pageType()

    expect(supabasePageType.capabilities).toEqual({
      read: 'pages:read_drafts',
      write: 'pages:write',
      publish: 'pages:publish',
      delete: 'pages:delete',
    })
  })
})
