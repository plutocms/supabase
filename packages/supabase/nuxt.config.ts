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

  // The Supabase logo, for the backend badge of the admin navbar (`pluto-supabase:logo`). A
  // tiny custom collection, like the brand icons of core: no simple-icons package.
  icon: {
    customCollections: [
      {
        prefix: 'pluto-supabase',
        width: 24,
        height: 24,
        icons: {
          logo: {
            body: '<path fill="currentColor" d="M11.9 1.036c-.015-.986-1.26-1.41-1.874-.637L.764 12.05C-.33 13.427.65 15.455 2.409 15.455h9.579l.113 7.51c.014.985 1.259 1.408 1.873.636l9.262-11.653c1.093-1.375.113-3.403-1.645-3.403h-9.642z"/>',
          },
        },
      },
    ],
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
