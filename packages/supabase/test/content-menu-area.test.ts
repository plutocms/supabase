import { definePlutoAreaType } from '@plutocms/core/shared/utils/area-type'
import { definePlutoMenuType } from '@plutocms/core/shared/utils/menu-type'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

beforeEach(() => {
  vi.stubGlobal('definePlutoMenuType', definePlutoMenuType)
  vi.stubGlobal('definePlutoAreaType', definePlutoAreaType)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('the menu type of the Supabase layer', () => {
  it('is the definition of core with the storage of the menus table', async () => {
    const { supabaseMenuType } = await import('../shared/utils/content-menu')

    expect(supabaseMenuType).toMatchObject({
      name: 'menu',
      source: 'menus',
      status: false,
      api: { public: true },
      trash: true,
      timestamps: { created: 'created_at', updated: 'updated_at' },
      defaultSort: { field: 'slug', direction: 'asc' },
    })
    expect(supabaseMenuType.files).toBeUndefined()
    expect(supabaseMenuType.fields.map((field) => field.name)).toEqual([
      'title',
      'slug',
      'body',
    ])
  })

  it('names the capability of the migration for write and delete', async () => {
    const { supabaseMenuType } = await import('../shared/utils/content-menu')

    expect(supabaseMenuType.capabilities).toEqual({
      write: 'menus:write',
      delete: 'menus:write',
    })
  })
})

describe('the area type of the Supabase layer', () => {
  it('is the definition of core with the storage of the areas table', async () => {
    const { supabaseAreaType } = await import('../shared/utils/content-area')

    expect(supabaseAreaType).toMatchObject({
      name: 'area',
      source: 'areas',
      status: false,
      api: { public: true },
      trash: true,
      timestamps: { created: 'created_at', updated: 'updated_at' },
      defaultSort: { field: 'slug', direction: 'asc' },
    })
    expect(supabaseAreaType.fields.map((field) => field.name)).toEqual([
      'title',
      'slug',
      'body',
    ])
  })

  it('names the capability of the migration for write and delete', async () => {
    const { supabaseAreaType } = await import('../shared/utils/content-area')

    expect(supabaseAreaType.capabilities).toEqual({
      write: 'areas:write',
      delete: 'areas:write',
    })
  })
})

describe('the Nitro plugin of menus and areas', () => {
  async function run(config: Record<string, unknown>): Promise<string[]> {
    const registered: string[] = []

    vi.stubGlobal('defineNitroPlugin', (plugin: () => void) => plugin)
    vi.stubGlobal('useRuntimeConfig', () => ({ public: config }))
    vi.stubGlobal('registerContentType', (type: { name: string }) =>
      registered.push(type.name)
    )
    vi.stubGlobal('supabaseMenuType', { name: 'menu' })
    vi.stubGlobal('supabaseAreaType', { name: 'area' })

    const plugin = (await import('../server/plugins/menus-and-areas'))
      .default as unknown as () => void
    plugin()

    return registered
  }

  it('registers nothing when both switches are off', async () => {
    expect(await run({})).toEqual([])
  })

  it('registers each type only when its switch is on', async () => {
    expect(await run({ plutoMenus: { enabled: true } })).toEqual(['menu'])
    expect(await run({ plutoAreas: { enabled: true } })).toEqual(['area'])
    expect(
      await run({
        plutoMenus: { enabled: true },
        plutoAreas: { enabled: true },
      })
    ).toEqual(['menu', 'area'])
  })
})
