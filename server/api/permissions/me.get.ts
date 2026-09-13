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
    // public.my_capabilities() is defined by 004_roles_and_capabilities.sql.
    // A site that has upgraded this package but not yet applied that
    // migration has no such function yet — that is an expected, temporary
    // state during an upgrade, not a server error. Degrade to an empty
    // capability list (the same shape a signed-out caller gets above)
    // rather than 500ing: the caller already fails every can() check with
    // an empty list, which is the correct, safe behavior until the pending
    // migration is applied through /admin/migrations (itself gated by
    // requireAdmin, not a capability, precisely so this state is always
    // recoverable — see server/utils/admin-guard.ts).
    console.error('my_capabilities() failed, returning an empty capability list:', error.message)
    return { capabilities: [] as string[] }
  }

  return { capabilities: data ?? [] }
})
