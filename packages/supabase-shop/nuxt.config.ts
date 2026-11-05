// Unset: the workspace link gives @plutocms/supabase (outside this repo, the npm package).
// Set it to the path of another checkout to test unpublished changes.
const supabaseLayer = process.env.PLUTO_SUPABASE_PATH || '@plutocms/supabase'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  // @plutocms/shop: the cart (`useCart`) and the price helpers (`formatProductPrice`), for
  // every backend. The settings of the cart are in app/app.config.ts.
  extends: [[supabaseLayer, { install: true }], '@plutocms/shop'],

  $meta: {
    name: 'supabase-shop',
  },

  // No `css` entry: the app owns the one Tailwind build, and Nuxt UI scans
  // this layer's app/ dir. See the single-tailwind-build skill in pluto.

  vite: {
    optimizeDeps: {
      include: [
        '@vue/devtools-core',
        '@vue/devtools-kit',
        'cookie',
        'tailwind-merge',
        '@vueuse/integrations/useChangeCase',
      ],
    },
  },
})
