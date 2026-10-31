// Point this at a local checkout (e.g. `../supabase`) to test unpublished
// changes; unset, it resolves to the published npm package. The media library
// (images in posts, the cover) is in core, with the driver of `supabase`.
const supabaseLayer = process.env.PLUTO_SUPABASE_PATH || '@plutocms/supabase'

// https://nuxt.com/docs/api/configuration/nuxt-config
// No @nuxt/eslint: a module of a layer runs in every app that extends it. The repo
// lints with @nuxt/eslint-config (eslint.config.mjs).
export default defineNuxtConfig({
  extends: [supabaseLayer],

  $meta: {
    name: 'supabase-blog',
  },

  // No `css` entry: the app owns the one Tailwind build, and Nuxt UI scans
  // this layer's app/ dir. See the single-tailwind-build skill in pluto.
})
