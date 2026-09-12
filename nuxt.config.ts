import type { PlutoMigrationFile } from './shared/types/migrations'

// Point these at a local checkout (e.g. `../pluto`, `../utils`) to test
// unpublished changes; unset, they resolve to the published npm packages.
const plutoLayer = process.env.PLUTO_PLUTO_PATH || '@plutocms/pluto'
const utilsLayer = process.env.PLUTO_UTILS_PATH || '@plutocms/utils'

export default defineNuxtConfig({
  extends: [[plutoLayer, { install: true }], utilsLayer],

  modules: ['@nuxt/eslint', '@nuxtjs/supabase'],

  $meta: {
    name: 'supabase',
  },

  css: ['#layers/supabase/app/assets/css/tailwind.css'],

  runtimeConfig: {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_KEY,
    plutoRootDir: '',
    plutoLayerMigrations: {} as Record<string, PlutoMigrationFile[]>,
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

  eslint: {
    config: {
      nuxt: {
        sortConfigKeys: true,
      },
      standalone: false,
    },
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
