import { fileURLToPath } from 'node:url'
import { plutoLayer } from '@plutocms/core/layers'

// The playground: a small app to try the layers of this repo together, like an app made from a
// template. Every Pluto layer comes from its local checkout next to this repo (core, the shop
// add-on, and the layers of this repo), so a change in any of them shows here at once. A
// checkout that is missing comes from npm. `PLUTO_USE_LOCAL=false` uses npm for all of them, and
// `PLUTO_<NAME>_PATH` points one layer at another folder (see the local-layers skill of core).
//
// The Supabase project comes from `playground/.env` (see `.env.example`). Leave `DATABASE_URL`
// out: with it, the server applies the pending migrations of the branch to that database when it
// starts.
const root = fileURLToPath(new URL('../..', import.meta.url))

export default defineNuxtConfig({
  extends: [
    plutoLayer('@plutocms/supabase-shop', { root }),
    plutoLayer('@plutocms/supabase-blog', { root }),
  ],

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
