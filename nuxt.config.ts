import { generateSupabaseTypes } from './scripts/supabase-typegen'

export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxtjs/supabase'],

  $development: {
    extends: ['../../plutocms/utils/', '../../plutocms/supabase-storage/'],
  },

  $meta: {
    name: 'supabase',
  },

  $production: {
    extends: ['github:plutocms/utils', 'github:plutocms/supabase-storage'],
  },

  runtimeConfig: {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_KEY,
  },

  ignore: ['./scripts/**', './supabase/**'],

  nitro: {
    externals: {
      inline: ['@supabase/supabase-js'],
    },
  },

  hooks: {
    ready: () => {
      generateSupabaseTypes()
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
    types: '~~/shared/types/supabase',
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
