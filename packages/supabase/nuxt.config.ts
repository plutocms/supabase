import type { PlutoMigrationFile } from './shared/types/migrations'

// Point this at a local checkout (e.g. `../pluto/packages/core`) to test
// unpublished changes; unset, it resolves to the published npm package.
const coreLayer = process.env.PLUTO_CORE_PATH || '@plutocms/core'

// The host of the Supabase project, at build time. `@nuxt/image` may only read
// remote images of the hosts in `image.domains` (the media files are in Storage).
function supabaseHost(): string {
  try {
    return new URL(process.env.SUPABASE_URL ?? '').host
  } catch {
    return ''
  }
}

export default defineNuxtConfig({
  extends: [[coreLayer, { install: true }]],

  // No @nuxt/eslint: a module of a layer runs in every app that extends it. The repo
  // lints with @nuxt/eslint-config (eslint.config.mjs).
  modules: ['@nuxtjs/supabase'],

  $meta: {
    name: 'supabase',
  },

  // No `css` entry: the app owns the one Tailwind build, and Nuxt UI scans
  // this layer's app/ dir. See the single-tailwind-build skill in pluto.

  runtimeConfig: {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_KEY,
    plutoRootDir: '',
    plutoLayerMigrations: {} as Record<string, PlutoMigrationFile[]>,
    public: {
      // The core media library uses the Supabase driver (server/utils/media-driver.ts).
      plutoMedia: { driver: 'supabase' },
    },
  },

  alias: {
    cookie: 'cookie-es',
  },

  ignore: ['./scripts/**', './supabase/**'],

  nitro: {
    alias: {
      cookie: 'cookie-es',
    },
  },

  image: {
    domains: supabaseHost() ? [supabaseHost()] : [],
  },

  supabase: {
    types: '#shared/types/supabase',
    cookiePrefix: 'access_token',

    redirectOptions: {
      login: '/admin/login',
      callback: '/auth/confirm',
      include: ['/admin/signup'],
      saveRedirectToCookie: false,
    },

    redirect: false,
  },
})
