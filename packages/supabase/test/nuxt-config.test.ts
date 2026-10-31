import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// nuxt.config.ts calls the global `defineNuxtConfig`, which Nuxt normally
// auto-imports (and types via its own generated .d.ts). Outside a Nuxt
// build it's the identity function (see node_modules/nuxt/dist/app/config.js)
// — stub it the same way, and re-declare its type since this file sits
// outside the project references that carry Nuxt's own ambient declaration.
declare global {
  function defineNuxtConfig<T>(config: T): T
}

beforeEach(() => {
  vi.stubGlobal('defineNuxtConfig', (config: unknown) => config)
})

afterEach(() => {
  vi.unstubAllGlobals()
  delete process.env.PLUTO_CORE_PATH
  vi.resetModules()
})

describe('core layer resolution', () => {
  it('defaults the core layer to its published npm package when unset', async () => {
    delete process.env.PLUTO_CORE_PATH

    const { default: config } = await import('../nuxt.config')

    expect(config.extends).toEqual([['@plutocms/core', { install: true }]])
  })

  it('honors PLUTO_CORE_PATH when set', async () => {
    process.env.PLUTO_CORE_PATH = '../pluto/packages/core'

    const { default: config } = await import('../nuxt.config')

    expect(config.extends).toEqual([
      ['../pluto/packages/core', { install: true }],
    ])
  })
})
