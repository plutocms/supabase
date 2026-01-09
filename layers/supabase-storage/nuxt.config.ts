export default defineNuxtConfig({
  extends: [['github:plutocms/utils', { giget: { silent: true } }]],

  $meta: {
    name: 'supabase-storage',
  },
})
