const cwd = process.cwd()

const isDev = cwd.includes('supabase')

export default defineNuxtConfig({
  extends: ['github:plutocms/pluto', 'github:plutocms/utils'],

  modules: ['@nuxt/eslint', '@nuxtjs/supabase'],

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

  eslint: {
    config: {
      nuxt: {
        sortConfigKeys: true,
      },
      standalone: false,
    },
  },

  supabase: !isDev
    ? {
        types: '#shared',
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
