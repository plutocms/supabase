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
    // state during an upgrade, not a server error. Fall back to the
    // profiles.is_admin column (the same check as requireAdmin, which gates
    // /admin/migrations): an admin gets ['*'], everyone else an empty list.
    // Without the fallback, the admin guard would see an admin with no
    // capability and keep them out of /admin/migrations, the one page that
    // can apply the missing migration.
    console.error('my_capabilities() failed, falling back to profiles.is_admin:', error.message)

    const { data: profile } = await client
      .from('profiles')
      .select('is_admin')
      .eq('id', user.sub)
      .maybeSingle()

    return { capabilities: profile?.is_admin ? ['*'] : ([] as string[]) }
  }

  return { capabilities: data ?? [] }
})
