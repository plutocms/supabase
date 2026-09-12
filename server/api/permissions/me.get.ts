import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

/**
 * The calling user's own capability list. No admin gate — every signed-in
 * user needs this to know what their own UI should show. A signed-out
 * caller gets an empty list, not a 401, so the client composable never
 * has to special-case this endpoint's error path.
 */
export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)

  if (!user) {
    return { capabilities: [] as string[] }
  }

  const client = await serverSupabaseClient<Database>(event)
  const { data, error } = await client.rpc('my_capabilities')

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { capabilities: data ?? [] }
})
