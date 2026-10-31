/**
 * Registers the Supabase media driver with the core media library, at Nitro
 * startup. See the media skill of `@plutocms/core`.
 */
export default defineNitroPlugin(() => {
  registerMediaDriver(createSupabaseMediaDriver())
})
