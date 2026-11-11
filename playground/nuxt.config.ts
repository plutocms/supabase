// The playground: a small app to try the layers of this repo together, like an app made from a
// template. It extends the layers by package name; the Bun workspace links the names to
// `packages/`, so a change in a layer shows here at once. Core comes from npm, or from a local
// checkout with `PLUTO_CORE_PATH`.
//
// The Supabase project comes from `playground/.env` (see `.env.example`). Leave `DATABASE_URL`
// out: with it, the server applies the pending migrations of the branch to that database when it
// starts.
export default defineNuxtConfig({
  extends: ['@plutocms/supabase-shop', '@plutocms/supabase-blog'],

  css: ['~/assets/css/main.css'],

  devServer: {
    port: 3200,
  },

  runtimeConfig: {
    public: {
      websiteName: 'Supabase playground',
    },
  },

  compatibilityDate: '2025-07-15',
})
