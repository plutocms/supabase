import { generateSupabaseTypes } from './scripts/supabase-typegen'

const cwd = process.cwd()

const isDev = cwd.includes('supabase')

export default defineNuxtConfig({
  extends: ['github:plutocms/utils', 'github:plutocms/supabase-storage'],

  modules: ['@nuxt/eslint', !isDev ? '@nuxtjs/supabase' : null, '@nuxt/ui'],

  $meta: {
    name: 'supabase',
  },

  runtimeConfig: {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_KEY,
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

  hooks: {
    ready: () => {
      if (!isDev) {
        generateSupabaseTypes()
      }
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

  // @ts-expect-error - Supabase module is only included in production mode
  supabase: !isDev
    ? {
        types: '~~/shared/types/supabase',
        cookiePrefix: 'access_token',

        redirectOptions: {
          login: '/admin/login',
          callback: '/auth/confirm',
          include: ['/admin/signup'],
          saveRedirectToCookie: false,
        },

        redirect: false,
      }
    : undefined,
})
