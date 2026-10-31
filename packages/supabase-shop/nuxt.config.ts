// Unset: the workspace link gives @plutocms/supabase (outside this repo, the npm package).
// Set it to the path of another checkout to test unpublished changes.
const supabaseLayer = process.env.PLUTO_SUPABASE_PATH || '@plutocms/supabase'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  extends: [[supabaseLayer, { install: true }]],

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
