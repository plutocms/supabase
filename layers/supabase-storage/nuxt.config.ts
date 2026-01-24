export default defineNuxtConfig({
  $development: {
    extends: ['../../../../plutocms/utils/'],
  },

  $production: {
    extends: ['github:plutocms/utils'],
  },

  $meta: {
    name: 'supabase-storage',
  },
})
