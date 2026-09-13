/**
 * Registers this layer's Supabase/PostgREST-backed `PlutoContentAdapter`
 * with core's generic content routes, at Nitro startup.
 */
export default defineNitroPlugin(() => {
  registerContentAdapter(createSupabaseContentAdapter())
})
