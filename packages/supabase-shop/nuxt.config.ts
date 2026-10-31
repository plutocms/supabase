// Point this at a local checkout (e.g. `../supabase`) to test
// unpublished changes; unset, it resolves to the published npm package.
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
